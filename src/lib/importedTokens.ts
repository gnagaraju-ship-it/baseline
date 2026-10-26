/**
 * An imported token set: tokens kept exactly as they were in the files they came from (Figma variable collections),
 * instead of being made by Baseline's generators. Built by scripts/build-untitled.mjs.
 */
import untitledType from '../data/untitled-type.json'
import { buildPalettes, withAlpha } from './colour'
import type { ExportInput, ExportModule, ExportSection } from './exportAll'
import { responsiveBlocks } from './breakpointCss'
import { typeByBreakpoint } from './responsive'
import { UNTITLED_ID, colourSchema, tokenSchemaOf } from './schemas'
import { isResolved, resolveAll, type ResolvedCell } from './tokens'

export type ImportedType = 'color' | 'number' | 'string'

/** `v` is the resolved value (hex colour, number or text); `a` names the variable it points at ("Collection::name"). */
export interface ImportedValue { v: string | number; a?: string }

export interface ImportedVariable {
  name: string
  type: ImportedType
  scopes: string[]
  values: Record<string, ImportedValue>
  /** Switched off: kept in the theme and still followed, but not written to an export. */
  off?: boolean
}

export interface ImportedCollection { name: string; modes: string[]; variables: ImportedVariable[] }

export interface ImportedSet { collections: ImportedCollection[] }

/** Which export module a variable belongs to. Elevation has no imported tokens. */
export function moduleOf(collection: string, name: string): ExportModule {
  if (collection === 'Brand palette') return 'ramps'
  if (collection === '1. Color modes') return 'semantic'
  if (collection === '6. Typography') return 'type'
  if (collection === '4. Widths' || collection === '5. Containers' || collection === BREAKPOINTS_COLLECTION) return 'grids'
  if (collection === '_Primitives') return name.startsWith('Spacing/') ? 'spacing' : 'ramps'
  return 'spacing' // radius and spacing
}

const kebab = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/** The CSS custom property of a variable: its whole path in kebab case. */
export const cssName = (name: string) => `--${kebab(name)}`

const target = (ref: string) => cssName(ref.split('::')[1])

function cssValue(value: ImportedValue): string {
  if (value.a) return `var(${target(value.a)})`
  return typeof value.v === 'number' ? `${value.v}px` : /^#[0-9A-F]{6,8}$/i.test(value.v) ? value.v : JSON.stringify(value.v)
}

/** Light/Dark style modes answer to the dark selector, the first mode to :root, any other mode to a data attribute. */
function selectorFor(collection: ImportedCollection, mode: string, index: number): string {
  if (index === 0) return ':root'
  if (/dark/i.test(mode)) return '[data-theme="dark"]'
  return `[data-${kebab(collection.name.replace(/^[\d.\s]+/, ''))}="${kebab(mode)}"]`
}

const TITLES: Record<ExportModule, string> = {
  ramps: 'Colour: palette ramps', semantic: 'Colour: semantic tokens (light and dark)', type: 'Type scale', grids: 'Grids', spacing: 'Spacing', elevation: 'Elevation'
}
const MODULES: ExportModule[] = ['ramps', 'semantic', 'type', 'grids', 'spacing', 'elevation']

/** The collection that holds the widths where the layout changes. */
export const BREAKPOINTS_COLLECTION = 'Breakpoints'
/** A collection with these three modes changes by breakpoint. */
export const RESPONSIVE_MODES = ['XXL', 'MD', 'XS'] as const
export const isResponsive = (c: ImportedCollection) => c.modes.length === 3 && RESPONSIVE_MODES.every((m, i) => c.modes[i] === m)

/** The widths of the MD and XXL breakpoints (768 and 1400 unless the set says otherwise). */
export function breakpointWidths(set: ImportedSet): { md: number; xxl: number } {
  const c = resolveSet(set).collections.find((x) => x.name === BREAKPOINTS_COLLECTION)
  const at = (name: string, fallback: number) => {
    const v = c?.variables.find((x) => x.name === name)
    const n = Number(v && Object.values(v.values)[0]?.v)
    return n > 0 ? n : fallback
  }
  return { md: at('breakpoint-md', 768), xxl: at('breakpoint-xxl', 1400) }
}

/** The collection with a value per breakpoint: every value of its first mode copied into XXL, MD and XS. Links stay links. */
export function makeResponsive(c: ImportedCollection): ImportedCollection {
  if (isResponsive(c)) return c
  return {
    ...c,
    modes: [...RESPONSIVE_MODES],
    variables: c.variables.map((v) => {
      const first = Object.values(v.values)[0]
      return { ...v, values: Object.fromEntries(RESPONSIVE_MODES.map((m) => [m, first ? { ...first } : { v: 0 }])) }
    })
  }
}

/** The variables of each module, grouped by collection. */
export function byModule(set: ImportedSet): Record<ExportModule, ImportedCollection[]> {
  const out = Object.fromEntries(MODULES.map((m) => [m, [] as ImportedCollection[]])) as Record<ExportModule, ImportedCollection[]>
  for (const c of set.collections) {
    for (const m of MODULES) {
      const variables = c.variables.filter((v) => !v.off && moduleOf(c.name, v.name) === m)
      if (variables.length) out[m].push({ ...c, variables })
    }
  }
  return out
}

export function importedCount(set: ImportedSet): number {
  return set.collections.reduce((n, c) => n + c.variables.length, 0)
}

/** CSS sections in the same shape as the generated ones, so the export can treat both alike. */
export function importedSections(set: ImportedSet): ExportSection[] {
  const groups = byModule(set)
  return MODULES.map((id) => {
    const blocks: string[] = []
    const widths = breakpointWidths(set)
    for (const c of groups[id]) {
      if (isResponsive(c)) {
        // mobile first: the XS values, then what changes from the MD and the XXL width up
        const lines = (m: string) => c.variables.filter((v) => v.values[m]).map((v) => `  ${cssName(v.name)}: ${cssValue(v.values[m])};`)
        if (c.variables.length) blocks.push(`/* ${c.name} */\n${responsiveBlocks([], { xxl: lines('XXL'), md: lines('MD'), xs: lines('XS') }, widths)}`)
        continue
      }
      c.modes.forEach((mode, i) => {
        const lines = c.variables.filter((v) => v.values[mode]).map((v) => `  ${cssName(v.name)}: ${cssValue(v.values[mode])};`)
        if (lines.length) blocks.push(`/* ${c.name}${c.modes.length > 1 ? `: ${mode}` : ''} */\n${selectorFor(c, mode, i)} {\n${lines.join('\n')}\n}`)
      })
    }
    return { id, title: TITLES[id], css: blocks.join('\n\n'), count: groups[id].reduce((n, c) => n + c.variables.length, 0) }
  })
}

type Json = Record<string, unknown>

/** The design tokens JSON of the chosen modules: one object per collection, tokens nested by their path. */
export function importedDoc(input: ImportedSet, modules: ExportModule[]): Json {
  const set = resolveSet(input)
  const out: Json = {}
  for (const id of modules) {
    for (const c of byModule(set)[id]) {
      const col = (out[c.name] ??= { $extensions: { 'com.baseline': { modes: c.modes } } }) as Json
      for (const v of c.variables) {
        const path = v.name.split('/')
        let node = col
        path.slice(0, -1).forEach((k) => { node = (node[k] ??= {}) as Json })
        const alias: Record<string, string> = {}
        const modeValues: Record<string, string | number> = {}
        for (const m of c.modes) {
          const val = v.values[m]
          if (!val) continue
          modeValues[m] = val.v
          if (val.a) alias[m] = val.a
        }
        node[path[path.length - 1]] = {
          $type: v.type,
          $value: modeValues[c.modes[0]] ?? Object.values(modeValues)[0],
          $extensions: { 'com.baseline': { modes: modeValues, ...(Object.keys(alias).length ? { alias } : {}) }, 'com.figma': { scopes: v.scopes } }
        }
      }
    }
  }
  return { Imported: out }
}

/** A colour to stand for the set: the middle step of its brand palette, else its first colour. */
export function importedAccent(set: ImportedSet): string {
  const brand = set.collections.find((c) => c.name === 'Brand palette')
  const step = brand?.variables.find((v) => /\/600$/.test(v.name))
  const own = step && (step.values.Original ?? Object.values(step.values)[0])
  if (own) return String(own.v)
  const first = set.collections.flatMap((c) => c.variables).find((v) => v.type === 'color')
  return first ? String(Object.values(first.values)[0].v) : '#9d00d6'
}

const ALL = ['ALL_SCOPES']

/**
 * The colours of a theme built on a colour schema, written as collections named like the files they came from:
 * "_Primitives" (ramps) with a "Style" mode and "1. Color modes" (semantic tokens) with Light and Dark modes.
 */
export function schemaCollections(s: ExportInput): ImportedCollection[] {
  const schema = colourSchema(s.schemaId)
  if (!schema) return []
  const palettes = buildPalettes(s.settings, schema)
  const resolved = resolveAll(palettes, s.tokenOverrides, s.tokenAlpha, tokenSchemaOf(schema))
  const nameOf = (key: string) => palettes.find((p) => p.key === key)?.name ?? key
  const stepName = (p: { labels?: string[] }, i: number) => p.labels?.[i] ?? schema.steps[i]

  const ramps: ImportedVariable[] = palettes.flatMap((p) => [
    ...p.steps.map((h, i) => ({ name: `Colors/${p.name}/${stepName(p, i)}`, type: 'color' as const, scopes: ALL, values: { Style: { v: `#${h}` } } })),
    // A palette with its own opacity also gets every step at that opacity.
    ...(p.alpha < 100 ? p.steps.map((h, i) => ({ name: `Colors/${p.name} (alpha)/${stepName(p, i)}`, type: 'color' as const, scopes: ALL, values: { Style: { v: `#${withAlpha(h, p.alpha)}` } } })) : [])
  ])

  const value = (c: ResolvedCell): ImportedValue => {
    if (c.palette === 'raw') return { v: c.ref.slice(4) }
    if (!c.hex) return { v: '#000000' }
    if (c.alpha < 100) return { v: `#${withAlpha(c.hex, c.alpha)}` }
    return { v: `#${c.hex}`, a: `_Primitives::Colors/${nameOf(c.palette)}/${c.ref.slice(c.ref.lastIndexOf('-') + 1)}` }
  }
  const tokens: ImportedVariable[] = resolved.tokens.filter(isResolved).map((t) => ({
    name: t.def.path ?? t.def.name, type: 'color' as const, scopes: ALL, values: { 'Light mode': value(t.light), 'Dark mode': value(t.dark) }
  }))
  return [
    { name: '_Primitives', modes: ['Style'], variables: ramps },
    { name: '1. Color modes', modes: ['Light mode', 'Dark mode'], variables: tokens },
    ...(schema.id === UNTITLED_ID ? [typographyCollection(s)] : [])
  ]
}

/** "6. Typography": fonts, the weights of the file, and the size and line height of every step at XXL, MD and XS. */
function typographyCollection(s: ExportInput): ImportedCollection {
  const by = typeByBreakpoint(s.type, s.grid)
  const rows = by.xxl.flatMap((g) => g.rows)
  const at = (k: 'xxl' | 'md' | 'xs') => by[k].flatMap((g) => g.rows)
  const modes = [...RESPONSIVE_MODES]
  const keys = ['xxl', 'md', 'xs'] as const
  const str = (name: string, v: string) => ({ name, type: 'string' as const, scopes: ['ALL_SCOPES'], values: Object.fromEntries(modes.map((m) => [m, { v }])) })
  const num = (name: string, pick: (r: (typeof rows)[number]) => number, step: string) => ({
    name, type: 'number' as const, scopes: ['ALL_SCOPES'],
    values: Object.fromEntries(modes.map((m, i) => [m, { v: pick(at(keys[i]).find((r) => r.name === step)!) }]))
  })
  return {
    name: '6. Typography',
    modes,
    variables: [
      str('Font family/font-family-display', s.type.headingFont),
      str('Font family/font-family-body', s.type.bodyFont),
      ...untitledType.weights.map((w) => str(w.name, String(w.value))),
      ...rows.map((r) => num(`Font size/${r.name}`, (x) => x.size, r.name)),
      ...rows.map((r) => num(`Line height/${r.name}`, (x) => x.lh, r.name))
    ]
  }
}

/** The imported collections with a schema's colours joined in (the primitives share one collection with the spacing). */
export function withSchemaColours(set: ImportedSet, s: ExportInput): ImportedSet {
  const colours = schemaCollections(s)
  if (!colours.length) return set
  const rest = set.collections.filter((c) => !colours.some((x) => x.name === c.name))
  const prim = set.collections.find((c) => c.name === '_Primitives')
  const merged = colours.map((c) => (c.name === '_Primitives' && prim ? { ...c, variables: [...c.variables, ...prim.variables] } : c))
  return { collections: [...merged, ...rest] }
}

// --- editing -------------------------------------------------------------------------------------------------------

const refOf = (collection: string, name: string) => `${collection}::${name}`

/** Every value with the alias followed to its current value, so an edited primitive reaches the tokens that point at it. */
export function resolveSet(set: ImportedSet): ImportedSet {
  const find = (ref: string, mode: string): string | number | undefined => {
    const [cn, vn] = ref.split('::')
    const v = set.collections.find((c) => c.name === cn)?.variables.find((x) => x.name === vn)
    return v ? (v.values[mode] ?? Object.values(v.values)[0])?.v : undefined
  }
  const follow = (value: ImportedValue, mode: string, depth = 0): ImportedValue => {
    if (!value.a || depth > 8) return value
    const [cn, vn] = value.a.split('::')
    const target = set.collections.find((c) => c.name === cn)?.variables.find((x) => x.name === vn)
    const tv = target ? (target.values[mode] ?? Object.values(target.values)[0]) : undefined
    return tv ? { v: follow(tv, mode, depth + 1).v, a: value.a } : { v: find(value.a, mode) ?? value.v, a: value.a }
  }
  return {
    collections: set.collections.map((c) => ({
      ...c,
      variables: c.variables.map((v) => ({ ...v, values: Object.fromEntries(Object.entries(v.values).map(([m, x]) => [m, follow(x, m)])) }))
    }))
  }
}

function editCollection(set: ImportedSet, collection: string, change: (c: ImportedCollection) => ImportedCollection): ImportedSet {
  return { collections: set.collections.map((c) => (c.name === collection ? change(c) : c)) }
}

/** A new value for a variable. It no longer points at another variable. */
export function setImportedValue(set: ImportedSet, collection: string, name: string, mode: string, v: string | number): ImportedSet {
  return editCollection(set, collection, (c) => ({ ...c, variables: c.variables.map((x) => (x.name === name ? { ...x, values: { ...x.values, [mode]: { v } } } : x)) }))
}

/** Renames a variable (a name already in use or an empty one is refused) and repoints the aliases that used the old name. */
export function renameImported(set: ImportedSet, collection: string, from: string, to: string): ImportedSet {
  const name = to.trim()
  const c = set.collections.find((x) => x.name === collection)
  if (!name || name === from || !c || c.variables.some((x) => x.name === name)) return set
  const was = refOf(collection, from)
  const now = refOf(collection, name)
  return {
    collections: set.collections.map((col) => ({
      ...col,
      variables: col.variables.map((x) => {
        const renamed = col.name === collection && x.name === from ? { ...x, name } : x
        const values = Object.fromEntries(Object.entries(renamed.values).map(([m, val]) => [m, val.a === was ? { ...val, a: now } : val]))
        return { ...renamed, values }
      })
    }))
  }
}

/** Adds a variable at the end, named "<prefix>-new" (numbered when taken), with the same value in every mode. */
export function addImported(set: ImportedSet, collection: string, value = 0): ImportedSet {
  return editCollection(set, collection, (c) => {
    const kind = c.variables[0]?.name.split('/').slice(0, -1).join('/')
    const stem = `${kind ? `${kind}/` : ''}new`
    let name = stem
    for (let n = 2; c.variables.some((x) => x.name === name); n++) name = `${stem}-${n}`
    return { ...c, variables: [...c.variables, { name, type: 'number', scopes: ['ALL_SCOPES'], values: Object.fromEntries(c.modes.map((m) => [m, { v: value }])) }] }
  })
}

/** Removes a variable. Tokens that pointed at it keep the value they had. */
export function removeImported(set: ImportedSet, collection: string, name: string): ImportedSet {
  const resolved = resolveSet(set)
  const gone = refOf(collection, name)
  return {
    collections: set.collections.map((c, ci) => ({
      ...c,
      variables: c.variables
        .filter((x) => !(c.name === collection && x.name === name))
        .map((x) => ({
          ...x,
          values: Object.fromEntries(Object.entries(x.values).map(([m, val]) => [m, val.a === gone ? { v: resolved.collections[ci].variables.find((y) => y.name === x.name)!.values[m].v } : val]))
        }))
    }))
  }
}

/** One collection back to what it was imported with. */
export function resetImported(set: ImportedSet, source: ImportedSet, collection: string): ImportedSet {
  const original = source.collections.find((c) => c.name === collection)
  return original ? editCollection(set, collection, () => JSON.parse(JSON.stringify(original))) : set
}

/** Points a variable at another one (its value becomes the target's). A target that does not exist leaves it as it was. */
export function setImportedAlias(set: ImportedSet, collection: string, name: string, mode: string, target: string): ImportedSet {
  const [tc, tn] = target.split('::')
  const t = resolveSet(set).collections.find((c) => c.name === tc)?.variables.find((v) => v.name === tn)
  const tv = t && (Object.values(t.values)[0] as ImportedValue | undefined)
  if (!tv || (tc === collection && tn === name)) return set
  return editCollection(set, collection, (c) => ({ ...c, variables: c.variables.map((x) => (x.name === name ? { ...x, values: { ...x.values, [mode]: { v: tv.v, a: target } } } : x)) }))
}

/** Adds a variable with a given name and value (ignored when the name is taken). */
export function addNamedImported(set: ImportedSet, collection: string, name: string, value: number): ImportedSet {
  return editCollection(set, collection, (c) =>
    c.variables.some((x) => x.name === name)
      ? c
      : { ...c, variables: [...c.variables, { name, type: 'number', scopes: ['ALL_SCOPES'], values: Object.fromEntries(c.modes.map((m) => [m, { v: value }])) }] }
  )
}

/** The variables that point at this one ("Collection::name"). */
export function followers(set: ImportedSet, collection: string, name: string): string[] {
  const ref = refOf(collection, name)
  return set.collections.flatMap((c) => c.variables.filter((v) => Object.values(v.values).some((x) => x.a === ref)).map((v) => v.name))
}

/** Switches a variable off or on. One that others follow cannot be switched off, so nothing in an export points at nothing. */
export function setImportedOff(set: ImportedSet, collection: string, name: string, off: boolean): ImportedSet {
  if (off && followers(set, collection, name).length) return set
  const mark = (x: ImportedVariable): ImportedVariable => {
    const { off: _was, ...rest } = x
    return off ? { ...rest, off: true } : rest
  }
  return editCollection(set, collection, (c) => ({ ...c, variables: c.variables.map((x) => (x.name === name ? mark(x) : x)) }))
}
