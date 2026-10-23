// Omni by Canvs: Import tokens.
// Reads the design tokens JSON exported from Omni and creates Figma Variables (Primitives, Semantic with
// Light and Dark modes, Type, Grid, Spacing) and effect styles (Elevation). Importing again updates in place.

figma.showUI(__html__, { width: 440, height: 560, themeColors: true });

var COLLECTIONS = {
  Primitives: ['Value'],
  Semantic: ['Light', 'Dark'],
  Type: ['Value'],
  Grid: ['Value'],
  Spacing: ['Value']
};
var ORDER = ['Primitives', 'Semantic', 'Type', 'Grid', 'Spacing'];

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
function scopesFor(group, path) {
  if (group === 'Primitives') return [];
  var last = path[path.length - 1];
  if (group === 'Semantic') {
    if (last.indexOf('text') === 0) return ['TEXT_FILL'];
    if (last.indexOf('border') === 0) return ['STROKE_COLOR'];
    return ['FRAME_FILL', 'SHAPE_FILL'];
  }
  if (group === 'Type') {
    return last === 'size' ? ['FONT_SIZE'] : last === 'line-height' ? ['LINE_HEIGHT'] : last === 'letter-spacing' ? ['LETTER_SPACING'] : last === 'weight' ? ['FONT_WEIGHT'] : ['ALL_SCOPES'];
  }
  if (group === 'Spacing') return ['GAP'];
  return ['ALL_SCOPES'];
}

// The CSS custom property a value is exported as, so designers and developers use the same name.
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

/**
 * Creates or updates variables and styles for the chosen groups of a design tokens document.
 * Returns { created, updated, styles } counts. Throws a readable Error when the document is not usable.
 */
async function importTokens(doc, groups) {
  if (!doc || typeof doc !== 'object') throw new Error('This is not a design tokens file.');
  var wanted = ORDER.filter(function (g) { return doc[g] && groups.indexOf(g) >= 0; });
  var wantsElevation = doc.Elevation && groups.indexOf('Elevation') >= 0;
  if (!wanted.length && !wantsElevation) throw new Error('Nothing to import: no known groups were selected.');

  var collections = await figma.variables.getLocalVariableCollectionsAsync();
  var variables = await figma.variables.getLocalVariablesAsync();
  var created = 0, updated = 0, styles = 0;
  var byCollection = {};

  async function collectionFor(name) {
    if (byCollection[name]) return byCollection[name];
    var modes = COLLECTIONS[name];
    var c = collections.find(function (x) { return x.name === name; });
    if (!c) {
      c = figma.variables.createVariableCollection(name);
      c.renameMode(c.modes[0].modeId, modes[0]);
    }
    modes.forEach(function (m) {
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
    if (v) { updated++; return v; }
    try { v = figma.variables.createVariable(name, c, type); }
    catch (e) { v = figma.variables.createVariable(name, c.id, type); }
    variables.push(v);
    created++;
    return v;
  }

  function valueFor(type, raw) {
    if (typeof raw === 'string' && raw[0] === '{') {
      var ref = raw.slice(1, -1).split('.');
      var group = byCollection[ref[0]];
      var target = group && findVariable(group, ref.slice(1).join('/'));
      if (!target) throw new Error('Missing variable for ' + raw + '. Import the Primitives group together with Semantic.');
      return figma.variables.createVariableAlias(target);
    }
    if (type === 'color') return parseColour(raw);
    return typeof raw === 'number' ? raw : parseFloat(raw);
  }

  // Semantic values alias the primitives. If only Semantic is chosen, the primitives must already be in the file.
  if (wanted.indexOf('Semantic') >= 0 && wanted.indexOf('Primitives') < 0) {
    var existingPrimitives = collections.find(function (x) { return x.name === 'Primitives'; });
    if (!existingPrimitives) throw new Error('Semantic tokens need the Primitives variables. Import the Primitives group too.');
    byCollection.Primitives = existingPrimitives;
  }

  for (var g = 0; g < wanted.length; g++) {
    var group = wanted[g];
    var c = await collectionFor(group);
    var items = [];
    walk(doc[group], [group], items);
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var type = it.leaf.$type;
      if (type === 'shadow') continue;
      var v = upsert(c, varName(it.path), type === 'color' ? 'COLOR' : 'FLOAT');
      if (it.leaf.$description) v.description = it.leaf.$description;
      try { v.scopes = scopesFor(group, it.path); } catch (e) {}
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

  if (wantsElevation) {
    var existing = await figma.getLocalEffectStylesAsync();
    var shadows = [];
    walk(doc.Elevation, ['Elevation'], shadows);
    shadows.forEach(function (s) {
      var name = 'elevation/' + s.path.slice(1).join('/');
      var style = existing.find(function (x) { return x.name === name; });
      if (!style) { style = figma.createEffectStyle(); style.name = name; }
      styles++;
      style.effects = s.leaf.$value.map(function (l) {
        return {
          type: 'DROP_SHADOW', color: parseColour(l.color), offset: { x: parseFloat(l.offsetX), y: parseFloat(l.offsetY) },
          radius: parseFloat(l.blur), spread: parseFloat(l.spread), visible: true, blendMode: 'NORMAL'
        };
      });
    });
  }

  return { created: created, updated: updated, styles: styles };
}

figma.ui.onmessage = async function (msg) {
  if (msg.type === 'cancel') { figma.closePlugin(); return; }
  if (msg.type !== 'import') return;
  try {
    var result = await importTokens(msg.doc, msg.groups);
    figma.ui.postMessage({ type: 'done', result: result });
    figma.notify('Omni: ' + result.created + ' variables created, ' + result.updated + ' updated' + (result.styles ? ', ' + result.styles + ' shadow styles' : ''));
  } catch (e) {
    figma.ui.postMessage({ type: 'error', message: e && e.message ? e.message : String(e) });
  }
};
