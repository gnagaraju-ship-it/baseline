// Baseline: Import tokens.
// Reads the design tokens JSON exported from Baseline and creates Figma Variables and styles:
//   Primitives  colour ramps                    (one mode)
//   Semantic    colour tokens                   (modes Light and Dark)
//   Type        font families and weights       (one mode)
//   Responsive  type sizes, grid, spacing       (modes XXL, MD and XS, one value per breakpoint)
//   Spacing     the spacing scale               (one mode)
// plus text styles (Type) and effect styles (Elevation). Importing again updates in place.

figma.showUI(__html__, { width: 440, height: 560, themeColors: true });

var COLLECTIONS = {
  Primitives: ['Value'],
  Semantic: ['Light', 'Dark'],
  Type: ['Value'],
  Responsive: ['XXL', 'MD', 'XS'],
  Spacing: ['Value']
};
var BREAKPOINT_MODES = ['XXL', 'MD', 'XS'];
var ORDER = ['Primitives', 'Semantic', 'Type', 'Grid', 'Spacing'];
var RESPONSIVE_TYPE_PARTS = ['size', 'line-height', 'letter-spacing'];

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

function modesOf(leaf) {
  var ext = leaf.$extensions && leaf.$extensions['com.figma'];
  return ext && ext.modes ? ext.modes : null;
}

// Which collection and variable name a token goes to. Tokens that change by breakpoint live in "Responsive".
function placement(group, path, leaf) {
  var p = path.slice(1);
  var modes = modesOf(leaf);
  var byBreakpoint = (modes && modes.XXL !== undefined) || (group === 'Type' && RESPONSIVE_TYPE_PARTS.indexOf(p[p.length - 1]) >= 0) || group === 'Grid';
  if (byBreakpoint) return { collection: 'Responsive', name: group.toLowerCase() + '/' + p.join('/') };
  return { collection: group, name: p.join('/') };
}

// Where a variable may be used in Figma's pickers.
function scopesFor(group, path) {
  if (group === 'Primitives') return [];
  var p = path.slice(1);
  var last = path[path.length - 1];
  if (group === 'Semantic') {
    if (last.indexOf('text') === 0) return ['TEXT_FILL'];
    if (last.indexOf('border') === 0) return ['STROKE_COLOR'];
    return ['FRAME_FILL', 'SHAPE_FILL'];
  }
  if (group === 'Type') {
    if (last === 'family' || p[0] === 'font-family') return ['FONT_FAMILY'];
    return last === 'size' ? ['FONT_SIZE'] : last === 'line-height' ? ['LINE_HEIGHT'] : last === 'letter-spacing' ? ['LETTER_SPACING'] : last === 'weight' ? ['FONT_WEIGHT'] : ['ALL_SCOPES'];
  }
  if (group === 'Grid') return last === 'width' ? ['WIDTH_HEIGHT'] : last === 'gutter' || last === 'margin' || last === 'sidebar' || last === 'column' ? ['GAP', 'WIDTH_HEIGHT'] : ['ALL_SCOPES'];
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
  if (group === 'Type' && p[0] === 'font-family') return '--type-font-' + p[1];
  if (group === 'Type') return '--type-' + p[0] + '-' + (p[1] === 'line-height' ? 'line' : p[1] === 'letter-spacing' ? 'track' : p[1]);
  if (group === 'Grid') return '--grid-' + p[0];
  if (group === 'Spacing') return p[0] === 'space' ? '--space-' + p[1] : '--' + p[0];
  return null;
}

var WEIGHT_NAMES = { 100: 'thin', 200: 'extralight', 300: 'light', 400: 'regular', 500: 'medium', 600: 'semibold', 700: 'bold', 800: 'extrabold', 900: 'black' };

function normStyle(text) { return String(text).toLowerCase().replace(/[^a-z]/g, ''); }

// The font style that matches a numeric weight, for example 600 matches "Semi Bold" or "SemiBold". Italics are skipped.
function fontStyleFor(fonts, family, weight) {
  var styles = fonts.filter(function (f) { return f.fontName.family === family; }).map(function (f) { return f.fontName.style; });
  if (!styles.length) return null;
  var wanted = WEIGHT_NAMES[Math.round(weight / 100) * 100] || 'regular';
  var exact = styles.find(function (x) { return normStyle(x) === wanted; });
  if (exact) return exact;
  var upright = styles.filter(function (x) { return !/italic|oblique/i.test(x); });
  return upright.find(function (x) { return normStyle(x) === 'regular' || normStyle(x) === 'normal'; }) || upright[0] || styles[0];
}

// Follows {Group.path} aliases inside the document down to a plain value. `mode` picks a breakpoint value.
function literal(doc, raw, mode) {
  var guard = 0;
  while (typeof raw === 'string' && raw[0] === '{' && guard++ < 10) {
    var node = doc;
    raw.slice(1, -1).split('.').forEach(function (k) { node = node && node[k]; });
    var modes = node && modesOf(node);
    raw = modes && mode && modes[mode] !== undefined ? modes[mode] : node && node.$value;
  }
  return raw;
}

/**
 * Creates or updates variables and styles for the chosen groups of a design tokens document.
 * Returns counts and lists of anything skipped or replaced. Throws a readable Error when the document is not usable.
 */
async function importTokens(doc, groups) {
  if (!doc || typeof doc !== 'object') throw new Error('This is not a design tokens file.');
  var wanted = ORDER.filter(function (g) { return doc[g] && groups.indexOf(g) >= 0; });
  var wantsElevation = doc.Elevation && groups.indexOf('Elevation') >= 0;
  if (!wanted.length && !wantsElevation) throw new Error('Nothing to import: no known groups were selected.');

  var collections = await figma.variables.getLocalVariableCollectionsAsync();
  var variables = await figma.variables.getLocalVariablesAsync();
  var created = 0, updated = 0, styles = 0, replaced = [], skipped = [];
  var byCollection = {};
  var placed = {}; // DTCG path ("Type.heading-xl.size") -> variable

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
    // A variable of the same name but another type (for example left by an older import) cannot be changed: replace it.
    if (v && v.resolvedType !== type) {
      try { v.remove(); } catch (e) {}
      variables.splice(variables.indexOf(v), 1);
      replaced.push(name);
      v = null;
    }
    if (v) { updated++; return v; }
    try { v = figma.variables.createVariable(name, c, type); }
    catch (e) { v = figma.variables.createVariable(name, c.id, type); }
    variables.push(v);
    created++;
    return v;
  }

  // The variable an alias like {Primitives.colour.neutral.3} points at: made in this run, or already in the file.
  function aliasTarget(ref) {
    var key = ref.slice(1, -1);
    if (placed[key]) return placed[key];
    var path = key.split('.');
    var node = doc;
    path.forEach(function (k) { node = node && node[k]; });
    if (!node || !('$value' in node)) return null;
    var where = placement(path[0], path, node);
    var c = collections.find(function (x) { return x.name === where.collection; });
    return c ? findVariable(c, where.name) : null;
  }

  function resolve(type, raw) {
    if (typeof raw === 'string' && raw[0] === '{') {
      var target = aliasTarget(raw);
      if (!target) throw new Error('Missing variable for ' + raw + '. Import the group it points at together with this one.');
      return figma.variables.createVariableAlias(target);
    }
    if (type === 'color') return parseColour(raw);
    if (type === 'fontFamily') return String(raw);
    return typeof raw === 'number' ? raw : parseFloat(raw);
  }

  function isNumber(value) { return typeof value === 'number' && isFinite(value); }

  // Letter spacing is stored in em in the file. A variable bound to a text style is read in pixels, so it holds em x font size
  // for that breakpoint.
  function trackingPx(step, em, mode) {
    var size = NaN;
    var token = doc.Type && doc.Type[step] && doc.Type[step].size;
    if (token) {
      var byMode = modesOf(token);
      size = parseFloat(literal(doc, byMode && byMode[mode] !== undefined ? byMode[mode] : token.$value, mode));
    }
    if (!isFinite(size)) size = 16; // no readable size for this step: fall back to a 16px text
    return Math.round(em * size * 1000) / 1000;
  }

  // Semantic values alias the primitives. If only Semantic is chosen, the primitives must already be in the file.
  if (wanted.indexOf('Semantic') >= 0 && wanted.indexOf('Primitives') < 0 && !collections.find(function (x) { return x.name === 'Primitives'; })) {
    throw new Error('Semantic tokens need the Primitives variables. Import the Primitives group too.');
  }

  for (var g = 0; g < wanted.length; g++) {
    var group = wanted[g];
    var items = [];
    walk(doc[group], [group], items);
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var type = it.leaf.$type;
      if (type === 'shadow') continue;
      var where = placement(group, it.path, it.leaf);
      var c = await collectionFor(where.collection);
      var modes = modesOf(it.leaf);
      var isTracking = group === 'Type' && it.path[it.path.length - 1] === 'letter-spacing';
      var isResponsive = where.collection === 'Responsive';

      // The value for each mode of the collection.
      var perMode = {};
      var bad = null;
      var modeNames = isResponsive ? BREAKPOINT_MODES : modes ? Object.keys(modes) : [COLLECTIONS[where.collection][0]];
      for (var mi = 0; mi < modeNames.length; mi++) {
        var mode = modeNames[mi];
        var raw = modes && modes[mode] !== undefined ? modes[mode] : it.leaf.$value;
        var value;
        if (type !== 'color' && type !== 'fontFamily' && !(typeof raw === 'string' && raw[0] === '{')) {
          value = resolve(type, raw);
          if (isTracking && isNumber(value)) value = trackingPx(it.path[1], value, mode);
          if (!isNumber(value)) { bad = raw; break; }
        } else {
          value = resolve(type, raw);
        }
        perMode[mode] = value;
      }
      // A number that cannot be read is reported by name and skipped, instead of stopping the whole import.
      if (bad !== null) { skipped.push(where.collection + '/' + where.name + ' (' + JSON.stringify(bad) + ')'); continue; }

      var v = upsert(c, where.name, type === 'color' ? 'COLOR' : type === 'fontFamily' ? 'STRING' : 'FLOAT');
      placed[it.path.join('.')] = v;
      if (it.leaf.$description) v.description = it.leaf.$description === 'em' ? 'px = em x font size' : it.leaf.$description;
      try { v.scopes = scopesFor(group, it.path); } catch (e) {}
      var css = cssName(group, it.path);
      if (css) { try { v.setVariableCodeSyntax('WEB', 'var(' + css + ')'); } catch (e) {} }
      Object.keys(perMode).forEach(function (m) {
        try {
          v.setValueForMode(modeId(c, m), perMode[m]);
        } catch (e) {
          throw new Error(where.collection + '/' + where.name + ': ' + (e && e.message ? e.message : e));
        }
      });
    }
  }

  // Text styles: one per type step (and weight variant), using the font, bound to the variables above.
  var textStyles = 0, missingFonts = [];
  if (wanted.indexOf('Type') >= 0) {
    var fonts = await figma.listAvailableFontsAsync();
    var existingTextStyles = await figma.getLocalTextStylesAsync();
    var steps = Object.keys(doc.Type).filter(function (k) { return k !== 'font-family' && doc.Type[k].size && doc.Type[k].family; });
    for (var si = 0; si < steps.length; si++) {
      var step = steps[si], t = doc.Type[step];
      var family = String(literal(doc, t.family.$value)), weight = Number(literal(doc, t.weight.$value));
      var styleName = fontStyleFor(fonts, family, weight);
      if (!styleName) { if (missingFonts.indexOf(family) < 0) missingFonts.push(family); continue; }
      var fontName = { family: family, style: styleName };
      await figma.loadFontAsync(fontName);
      var ts = existingTextStyles.find(function (x) { return x.name === 'type/' + step; });
      if (!ts) { ts = figma.createTextStyle(); ts.name = 'type/' + step; existingTextStyles.push(ts); }
      ts.fontName = fontName;
      // The style starts at the largest breakpoint; the bound variables switch it with the frame's XXL / MD / XS mode.
      ts.fontSize = parseFloat(literal(doc, t.size.$value, 'XXL'));
      ts.lineHeight = { unit: 'PIXELS', value: parseFloat(literal(doc, t['line-height'].$value, 'XXL')) };
      var em = Number(literal(doc, t['letter-spacing'].$value));
      ts.letterSpacing = { unit: 'PIXELS', value: trackingPx(step, isFinite(em) ? em : 0, 'XXL') };
      [['fontSize', 'size'], ['lineHeight', 'line-height'], ['letterSpacing', 'letter-spacing'], ['fontFamily', 'family'], ['fontWeight', 'weight']].forEach(function (pair) {
        var bound = placed['Type.' + step + '.' + pair[1]] || aliasTarget('{Type.' + step + '.' + pair[1] + '}');
        if (bound) { try { ts.setBoundVariable(pair[0], bound); } catch (e) {} }
      });
      textStyles++;
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

  return { created: created, updated: updated, styles: styles, textStyles: textStyles, missingFonts: missingFonts, skipped: skipped, replaced: replaced };
}

figma.ui.onmessage = async function (msg) {
  if (msg.type === 'cancel') { figma.closePlugin(); return; }
  if (msg.type !== 'import') return;
  try {
    var result = await importTokens(msg.doc, msg.groups);
    figma.ui.postMessage({ type: 'done', result: result });
    figma.notify('Baseline: ' + result.created + ' variables created, ' + result.updated + ' updated' + (result.styles ? ', ' + result.styles + ' shadow styles' : '') + (result.textStyles ? ', ' + result.textStyles + ' text styles' : '') + (result.missingFonts && result.missingFonts.length ? '. Fonts not available in Figma: ' + result.missingFonts.join(', ') : '') + (result.replaced && result.replaced.length ? '. Replaced ' + result.replaced.length + ' variables that had the wrong type' : '') + (result.skipped && result.skipped.length ? '. Skipped ' + result.skipped.length + ' values that were not numbers' : ''));
  } catch (e) {
    figma.ui.postMessage({ type: 'error', message: e && e.message ? e.message : String(e) });
  }
};
