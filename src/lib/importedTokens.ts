/**
 * An imported token set: tokens kept exactly as they were in the files they came from (Figma variable collections),
 * instead of being made by Baseline's generators. Built by scripts/build-untitled.mjs.
 */
import type { ExportModule, ExportSection } from './exportAll'

export type ImportedType = 'color' | 'number' | 'string'

/** `v` is the resolved value (hex colour, number or text); `a` names the variable it points at ("Collection::name"). */
export interface ImportedValue { v: string | number; a?: string }

export interface ImportedVariable { name: string; type: ImportedType; scopes: string[]; values: Record<string, ImportedValue> }

export interface ImportedCollection { name: string; modes: string[]; variables: ImportedVariable[] }

export interface ImportedSet { collections: ImportedCollection[] }

/** Which export module a variable belongs to. Elevation has no imported tokens. */
export function moduleOf(collection: string, name: string): ExportModule {
  if (collection === 'Brand palette') return 'ramps'
  if (collection === '1. Color modes') return 'semantic'
  if (collection === '6. Typography') return 'type'
  if (collection === '4. Widths' || collection === '5. Containers') return 'grids'
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

/** The variables of each module, grouped by collection. */
export function byModule(set: ImportedSet): Record<ExportModule, ImportedCollection[]> {
  const out = Object.fromEntries(MODULES.map((m) => [m, [] as ImportedCollection[]])) as Record<ExportModule, ImportedCollection[]>
  for (const c of set.collections) {
    for (const m of MODULES) {
      const variables = c.variables.filter((v) => moduleOf(c.name, v.name) === m)
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
    for (const c of groups[id]) {
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
export function importedDoc(set: ImportedSet, modules: ExportModule[]): Json {
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
