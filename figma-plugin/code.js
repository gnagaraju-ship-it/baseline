// Baseline: Import tokens.
// Reads the design tokens JSON exported from Baseline and creates Figma Variables and styles:
//   Primitives  colour ramps                    (one mode)
//   Semantic    colour tokens                   (modes Light and Dark)
//   Type        font families and weights       (one mode)
//   Responsive  type sizes, grid, spacing       (modes XXL, MD and XS, one value per breakpoint)
//   Spacing     the spacing scale               (one mode)
// plus text styles (Type) and effect styles (Elevation). Importing again updates in place.
// A file with several themes ("Themes") gets a mode per theme in each collection where the themes differ:
// "Ocean" in a one-mode collection, "Ocean / Light" or "Ocean / XXL" in the others. Collections where every
// theme holds the same values keep their normal modes.

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

// The themes in a file: a multi-theme file has a "Themes" object, anything else is one theme.
function themesOf(input) {
  if (input && typeof input.Themes === 'object' && input.Themes) {
    var ext = input.$extensions && input.$extensions['com.baseline'];
    var names = ext && ext.themes ? ext.themes.filter(function (n) { return input.Themes[n]; }) : [];
    Object.keys(input.Themes).forEach(function (n) { if (names.indexOf(n) < 0) names.push(n); });
    return names.map(function (n) { return { name: n, doc: input.Themes[n] }; });
  }
  return [{ name: 'Default', doc: input }];
}

function rawFor(leaf, base) {
  var m = modesOf(leaf);
  return m && m[base] !== undefined ? m[base] : leaf.$value;
}

/**
 * Creates or updates variables and styles for the chosen groups of a design tokens document.
 * Returns counts and lists of anything skipped or replaced. Throws a readable Error when the document is not usable.
 */
async function importTokens(input, groups) {
  if (!input || typeof input !== 'object') throw new Error('This is not a design tokens file.');
  var all = themesOf(input);
  if (!all.length) throw new Error('This is not a design tokens file.');
  // Themes made of imported tokens keep their own collections and modes; the others are generated by Baseline.
  var imports = groups.indexOf('Imported') < 0 ? [] : all.filter(function (th) { return th.doc.Imported; });
  var themes = all.filter(function (th) { return !th.doc.Imported; });
  if (!themes.length) themes = [{ name: 'Default', doc: {} }];
  var doc = themes[0].doc; // the document the helpers below read; set to each theme's own while its values are written
  var wanted = ORDER.filter(function (g) { return themes.some(function (th) { return th.doc[g]; }) && groups.indexOf(g) >= 0; });
  // Shadows may sit in any document, next to generated groups or imported collections.
  var elevationDocs = all.filter(function (th) { return th.doc.Elevation; });
  var wantsElevation = elevationDocs.length > 0 && groups.indexOf('Elevation') >= 0;
  if (!wanted.length && !wantsElevation && !imports.length) throw new Error('Nothing to import: no known groups were selected.');

  var collections = await figma.variables.getLocalVariableCollectionsAsync();
  var variables = await figma.variables.getLocalVariablesAsync();
  var created = 0, updated = 0, styles = 0, replaced = [], skipped = [], limited = [];
  var byCollection = {}, blocked = {};
  var placed = {}; // DTCG path ("Type.heading-xl.size") -> variable

  // Per collection: do the themes hold different values? Only then does every theme get its own modes.
  var differs = {};
  var entries = [], entryAt = {};
  wanted.forEach(function (group) {
    themes.forEach(function (th, ti) {
      var items = [];
      walk(th.doc[group], [group], items);
      items.forEach(function (it) {
        var key = it.path.join('.');
        var e = entryAt[key];
        if (!e) { e = entryAt[key] = { group: group, path: it.path, leaf: it.leaf, leaves: {} }; entries.push(e); }
        e.leaves[ti] = it.leaf;
      });
    });
  });
  entries.forEach(function (e) {
    var where = placement(e.group, e.path, e.leaf);
    var sigs = Object.keys(e.leaves).map(function (ti) {
      var leaf = e.leaves[ti];
      return JSON.stringify(baseModesFor(where, leaf).map(function (m) { return rawFor(leaf, m); }));
    });
    if (Object.keys(e.leaves).length < themes.length || sigs.some(function (x) { return x !== sigs[0]; })) differs[where.collection] = true;
  });

  function baseModesFor(where, leaf) {
    var modes = modesOf(leaf);
    return where.collection === 'Responsive' ? BREAKPOINT_MODES : modes ? Object.keys(modes) : [COLLECTIONS[where.collection][0]];
  }

  // The Figma mode a theme's value for a base mode (Light, XXL, Value) is written to.
  function modeNameFor(collection, ti, base) {
    if (!differs[collection] || themes.length < 2) return base;
    return COLLECTIONS[collection].length > 1 ? themes[ti].name + ' / ' + base : themes[ti].name;
  }

  function requiredModes(name) {
    if (!differs[name] || themes.length < 2) return COLLECTIONS[name];
    var out = [];
    themes.forEach(function (th, ti) { COLLECTIONS[name].forEach(function (m) { out.push(modeNameFor(name, ti, m)); }); });
    return out;
  }

  async function collectionFor(name) {
    if (byCollection[name]) return byCollection[name];
    if (blocked[name]) return null;
    var modes = requiredModes(name);
    var c = collections.find(function (x) { return x.name === name; });
    if (!c) {
      c = figma.variables.createVariableCollection(name);
      c.renameMode(c.modes[0].modeId, modes[0]);
    }
    try {
      modes.forEach(function (m) {
        if (!c.modes.find(function (x) { return x.name === m; })) c.addMode(m);
      });
    } catch (e) {
      // Figma limits the modes per collection by plan: leave this collection out and import the rest.
      blocked[name] = true;
      limited.push(name + ' needs ' + modes.length + ' modes' + (e && e.message ? ' (' + e.message + ')' : ''));
      return null;
    }
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

  for (var ei = 0; ei < entries.length; ei++) {
    var e = entries[ei];
    var group = e.group;
    var type = e.leaf.$type;
    if (type === 'shadow') continue;
    var where = placement(group, e.path, e.leaf);
    var c = await collectionFor(where.collection);
    if (!c) continue;
    var isTracking = group === 'Type' && e.path[e.path.length - 1] === 'letter-spacing';
    var themed = differs[where.collection] && themes.length > 1;
    var targets = themed ? themes.map(function (th, ti) { return ti; }) : [0];

    // The value for each mode of the collection, per theme when the themes differ.
    var writes = [];
    var bad = null;
    for (var ti = 0; ti < targets.length && bad === null; ti++) {
      var theme = targets[ti];
      var leaf = e.leaves[theme] || e.leaf;
      doc = themes[theme].doc;
      var modeNames = baseModesFor(where, leaf);
      for (var mi = 0; mi < modeNames.length; mi++) {
        var mode = modeNames[mi];
        var raw = rawFor(leaf, mode);
        var value;
        if (type !== 'color' && type !== 'fontFamily' && !(typeof raw === 'string' && raw[0] === '{')) {
          value = resolve(type, raw);
          if (isTracking && isNumber(value)) value = trackingPx(e.path[1], value, mode);
          if (!isNumber(value)) { bad = raw; break; }
        } else {
          value = resolve(type, raw);
        }
        writes.push({ mode: modeNameFor(where.collection, theme, mode), value: value });
      }
    }
    // A number that cannot be read is reported by name and skipped, instead of stopping the whole import.
    if (bad !== null) { skipped.push(where.collection + '/' + where.name + ' (' + JSON.stringify(bad) + ')'); continue; }

    var v = upsert(c, where.name, type === 'color' ? 'COLOR' : type === 'fontFamily' ? 'STRING' : 'FLOAT');
    placed[e.path.join('.')] = v;
    if (e.leaf.$description) v.description = e.leaf.$description === 'em' ? 'px = em x font size' : e.leaf.$description;
    try { v.scopes = scopesFor(group, e.path); } catch (err) {}
    var css = cssName(group, e.path);
    if (css) { try { v.setVariableCodeSyntax('WEB', 'var(' + css + ')'); } catch (err) {} }
    writes.forEach(function (w) {
      try {
        v.setValueForMode(modeId(c, w.mode), w.value);
      } catch (err) {
        throw new Error(where.collection + '/' + where.name + ': ' + (err && err.message ? err.message : err));
      }
    });
  }
  doc = themes[0].doc;

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
    // Effect styles cannot hold variables, so themes whose shadows differ get a folder each.
    var perTheme = elevationDocs.map(function (th) { var list = []; walk(th.doc.Elevation, ['Elevation'], list); return list; });
    var sameShadows = elevationDocs.length < 2 || perTheme.every(function (l) { return JSON.stringify(l) === JSON.stringify(perTheme[0]); });
    var shadows = [];
    perTheme.forEach(function (list, ti) {
      if (sameShadows && ti > 0) return;
      list.forEach(function (x) { shadows.push({ path: x.path, leaf: x.leaf, theme: sameShadows ? null : elevationDocs[ti].name }); });
    });
    shadows.forEach(function (s) {
      var name = 'elevation/' + (s.theme ? s.theme + '/' : '') + s.path.slice(1).join('/');
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

  // Imported tokens: each collection keeps its own modes, variable names and aliases.
  var importedCollections = 0;
  if (imports.length) {
    var made = {}; // "Collection::variable name" -> variable
    var pending = [];
    for (var ii = 0; ii < imports.length; ii++) {
      var set = imports[ii].doc.Imported;
      var names = Object.keys(set);
      for (var ni = 0; ni < names.length; ni++) {
        var colName = names[ni];
        var colDoc = set[colName];
        var colModes = colDoc.$extensions && colDoc.$extensions['com.baseline'] ? colDoc.$extensions['com.baseline'].modes : ['Value'];
        var ic = collections.find(function (x) { return x.name === colName; });
        if (!ic) {
          ic = figma.variables.createVariableCollection(colName);
          ic.renameMode(ic.modes[0].modeId, colModes[0]);
          collections.push(ic);
        }
        try {
          colModes.forEach(function (m) { if (!ic.modes.find(function (x) { return x.name === m; })) ic.addMode(m); });
        } catch (e) {
          limited.push(colName + ' needs ' + colModes.length + ' modes' + (e && e.message ? ' (' + e.message + ')' : ''));
          continue;
        }
        importedCollections++;
        var leaves = [];
        walk(colDoc, [], leaves);
        leaves.forEach(function (lf) {
          var ext = lf.leaf.$extensions || {};
          var base = ext['com.baseline'] || {};
          var vt = lf.leaf.$type === 'color' ? 'COLOR' : lf.leaf.$type === 'number' ? 'FLOAT' : 'STRING';
          var vr = upsert(ic, lf.path.join('/'), vt);
          made[colName + '::' + lf.path.join('/')] = vr;
          if (ext['com.figma'] && ext['com.figma'].scopes) { try { vr.scopes = ext['com.figma'].scopes; } catch (e) {} }
          pending.push({ variable: vr, collection: ic, type: lf.leaf.$type, modes: base.modes || {}, alias: base.alias || {}, label: colName + '/' + lf.path.join('/') });
        });
      }
    }
    // Values last, so an alias can point at a variable from any collection in the file.
    pending.forEach(function (p) {
      Object.keys(p.modes).forEach(function (m) {
        var raw = p.modes[m];
        var value;
        if (p.alias[m] && made[p.alias[m]]) value = figma.variables.createVariableAlias(made[p.alias[m]]);
        else if (p.type === 'color') value = parseColour(raw);
        else if (p.type === 'number') value = typeof raw === 'number' ? raw : parseFloat(raw);
        else value = String(raw);
        if (p.type === 'number' && !isNumber(value) && !(value && value.type === 'VARIABLE_ALIAS')) { skipped.push(p.label + ' (' + JSON.stringify(raw) + ')'); return; }
        try { p.variable.setValueForMode(modeId(p.collection, m), value); }
        catch (e) { throw new Error(p.label + ': ' + (e && e.message ? e.message : e)); }
      });
    });
  }

  return { imported: importedCollections, created: created, updated: updated, styles: styles, textStyles: textStyles, missingFonts: missingFonts, skipped: skipped, replaced: replaced, limited: limited, themes: themes.length > 1 ? themes.map(function (t) { return t.name; }) : [] };
}

figma.ui.onmessage = async function (msg) {
  if (msg.type === 'cancel') { figma.closePlugin(); return; }
  if (msg.type !== 'import') return;
  try {
    var result = await importTokens(msg.doc, msg.groups);
    figma.ui.postMessage({ type: 'done', result: result });
    figma.notify('Baseline: ' + result.created + ' variables created, ' + result.updated + ' updated' + (result.styles ? ', ' + result.styles + ' shadow styles' : '') + (result.textStyles ? ', ' + result.textStyles + ' text styles' : '') + (result.missingFonts && result.missingFonts.length ? '. Fonts not available in Figma: ' + result.missingFonts.join(', ') : '') + (result.replaced && result.replaced.length ? '. Replaced ' + result.replaced.length + ' variables that had the wrong type' : '') + (result.limited && result.limited.length ? '. Not imported, too many modes for your Figma plan: ' + result.limited.join('; ') : '') + (result.skipped && result.skipped.length ? '. Skipped ' + result.skipped.length + ' values that were not numbers' : ''));
  } catch (e) {
    figma.ui.postMessage({ type: 'error', message: e && e.message ? e.message : String(e) });
  }
};
