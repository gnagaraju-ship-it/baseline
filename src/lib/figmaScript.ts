/**
 * A self-contained Figma plugin script that creates the tokens as Figma Variables and effect styles.
 * Figma cannot import a design-tokens JSON file by itself, so this runs inside Figma (as a development plugin
 * or in the free Scripter plugin) and uses the Plugin API directly. Running it again updates what it created.
 */
import type { ExportInput, ExportModule } from './exportAll'
import { buildFigmaTokens } from './figmaExport'

const GROUP: Record<ExportModule, string> = {
  ramps: 'Primitives', semantic: 'Semantic', type: 'Type', grids: 'Grid', spacing: 'Spacing', elevation: 'Elevation'
}

/** The part that runs in Figma. It reads DOC (the design tokens document) and writes Variables and styles. */
const RUNTIME = String.raw`
const COLLECTIONS = {
  Primitives: ['Value'],
  Semantic: ['Light', 'Dark'],
  Type: ['Value'],
  Grid: ['Value'],
  Spacing: ['Value']
};

function walk(node, path, out) {
  if (!node || typeof node !== 'object') return;
  if ('$value' in node) { out.push({ path: path, leaf: node }); return; }
  Object.keys(node).forEach(function (k) { if (k[0] !== '$') walk(node[k], path.concat(k), out); });
}

function parseColour(text) {
  var h = String(text).replace('#', '');
  var n = function (i) { return parseInt(h.slice(i, i + 2), 16) / 255; };
  return { r: n(0), g: n(2), b: n(4), a: h.length >= 8 ? n(6) : 1 };
}

function varName(path) { return path.slice(1).join('/'); }

// Where a variable may be used in Figma's pickers.
function scopesFor(group, path, type) {
  if (group === 'Primitives') return [];
  if (group === 'Semantic') {
    var n = path[path.length - 1];
    if (n.indexOf('text') === 0) return ['TEXT_FILL'];
    if (n.indexOf('border') === 0) return ['STROKE_COLOR'];
    return ['FRAME_FILL', 'SHAPE_FILL'];
  }
  var last = path[path.length - 1];
  if (group === 'Type') return last === 'size' ? ['FONT_SIZE'] : last === 'line-height' ? ['LINE_HEIGHT'] : last === 'letter-spacing' ? ['LETTER_SPACING'] : last === 'weight' ? ['FONT_WEIGHT'] : ['ALL_SCOPES'];
  if (group === 'Spacing') return ['GAP'];
  return ['ALL_SCOPES'];
}

// The CSS custom property this value is exported as, so designers and developers use the same name.
function cssName(group, path) {
  var p = path.slice(1);
  if (group === 'Primitives') {
    var key = p[1], step = p[2];
    if (key === 'black-alpha' || key === 'white-alpha') return null;
    return key.slice(-6) === '-alpha' ? '--' + key.slice(0, -6) + '-' + step + '-alpha' : '--' + key + '-' + step;
  }
  if (group === 'Semantic') return '--' + p[1];
  if (group === 'Type') return '--type-' + p[0] + '-' + (p[1] === 'line-height' ? 'line' : p[1] === 'letter-spacing' ? 'track' : p[1]);
  if (group === 'Grid') return '--grid-' + p[0] + '-' + p[1];
  if (group === 'Spacing') return p[0] === 'space' ? '--space-' + p[1] : '--' + p[0] + '-' + p[1];
  return null;
}

(async function () {
  var collections = await figma.variables.getLocalVariableCollectionsAsync();
  var variables = await figma.variables.getLocalVariablesAsync();
  var made = 0, effectStyles = 0;
  var byCollection = {};

  async function collectionFor(name) {
    if (byCollection[name]) return byCollection[name];
    var wanted = COLLECTIONS[name];
    var c = collections.find(function (x) { return x.name === name; });
    if (!c) {
      c = figma.variables.createVariableCollection(name);
      c.renameMode(c.modes[0].modeId, wanted[0]);
    }
    wanted.forEach(function (m) {
      if (!c.modes.find(function (x) { return x.name === m; })) c.addMode(m);
    });
    byCollection[name] = c;
    return c;
  }

  function modeId(c, name) {
    var m = c.modes.find(function (x) { return x.name === name; });
    return (m || c.modes[0]).modeId;
  }

  function findVariable(c, name) {
    return variables.find(function (v) { return v.variableCollectionId === c.id && v.name === name; });
  }

  function upsert(c, name, type) {
    var v = findVariable(c, name);
    if (v) return v;
    try { v = figma.variables.createVariable(name, c, type); }
    catch (e) { v = figma.variables.createVariable(name, c.id, type); }
    variables.push(v);
    made++;
    return v;
  }

  function valueFor(type, raw) {
    if (typeof raw === 'string' && raw[0] === '{') {
      var ref = raw.slice(1, -1).split('.');
      var target = findVariable(byCollection[ref[0]], ref.slice(1).join('/'));
      if (!target) throw new Error('Missing variable for ' + raw);
      return figma.variables.createVariableAlias(target);
    }
    if (type === 'color') return parseColour(raw);
    return typeof raw === 'number' ? raw : parseFloat(raw);
  }

  var order = ['Primitives', 'Semantic', 'Type', 'Grid', 'Spacing'];
  for (var g = 0; g < order.length; g++) {
    var group = order[g];
    if (!DOC[group]) continue;
    var c = await collectionFor(group);
    var items = [];
    walk(DOC[group], [group], items);
    // Primitives first inside a run so aliases always find their target.
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var type = it.leaf.$type;
      if (type === 'shadow') continue;
      var v = upsert(c, varName(it.path), type === 'color' ? 'COLOR' : 'FLOAT');
      if (it.leaf.$description) v.description = it.leaf.$description;
      try { v.scopes = scopesFor(group, it.path, type); } catch (e) {}
      var css = cssName(group, it.path);
      if (css) { try { v.setVariableCodeSyntax('WEB', 'var(' + css + ')'); } catch (e) {} }
      var ext = it.leaf.$extensions && it.leaf.$extensions['com.figma'];
      if (ext && ext.modes) {
        Object.keys(ext.modes).forEach(function (m) { v.setValueForMode(modeId(c, m), valueFor(type, ext.modes[m])); });
      } else {
        v.setValueForMode(modeId(c, COLLECTIONS[group][0]), valueFor(type, it.leaf.$value));
      }
    }
  }

  if (DOC.Elevation) {
    var styles = await figma.getLocalEffectStylesAsync();
    var shadows = [];
    walk(DOC.Elevation, ['Elevation'], shadows);
    shadows.forEach(function (s) {
      var name = 'elevation/' + s.path.slice(1).join('/');
      var style = styles.find(function (x) { return x.name === name; });
      if (!style) { style = figma.createEffectStyle(); style.name = name; effectStyles++; }
      style.effects = s.leaf.$value.map(function (l) {
        var col = parseColour(l.color);
        return {
          type: 'DROP_SHADOW', color: col, offset: { x: parseFloat(l.offsetX), y: parseFloat(l.offsetY) },
          radius: parseFloat(l.blur), spread: parseFloat(l.spread), visible: true, blendMode: 'NORMAL'
        };
      });
    });
  }

  var message = 'Omni: ' + made + ' new variables' + (effectStyles ? ', ' + effectStyles + ' effect styles' : '') + '. Existing ones were updated.';
  figma.notify(message, { timeout: 6000 });
  try { figma.closePlugin(); } catch (e) {}
})().catch(function (e) { figma.notify('Omni import failed: ' + e.message, { error: true }); try { figma.closePlugin(); } catch (x) {} });
`

export function figmaPluginScript(input: ExportInput, selection: ExportModule[]): string {
  const doc = buildFigmaTokens(input) as Record<string, unknown>
  const keep = new Set(selection.map((m) => GROUP[m]))
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(doc)) if (!k.startsWith('$') && keep.has(k)) out[k] = v
  return [
    '// Omni by Canvs: creates your tokens as Figma Variables and effect styles.',
    '// Run it as a development plugin (code.js) or paste it into the Scripter plugin. Running it again updates in place.',
    `const DOC = ${JSON.stringify(out)};`,
    RUNTIME.trim(),
    ''
  ].join('\n')
}
