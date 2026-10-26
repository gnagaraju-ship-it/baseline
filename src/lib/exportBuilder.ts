/**
 * What the Export dialog produces: the chosen modules, in the chosen format.
 */
import { themedSections, type ExportInput, type ExportModule, type NamedTheme } from './exportAll'
import { buildFigmaTokens } from './figmaExport'

export type ExportFormat = 'css' | 'json'

export const EXPORT_MODULES: ReadonlyArray<{ id: ExportModule; label: string; note: string }> = [
  { id: 'ramps', label: 'Colour ramps', note: 'Palette steps' },
  { id: 'semantic', label: 'Semantic tokens', note: 'Light and dark, reference the ramps' },
  { id: 'type', label: 'Type scale', note: 'Size, line height, tracking, weights' },
  { id: 'grids', label: 'Grids', note: 'Per breakpoint' },
  { id: 'spacing', label: 'Spacing', note: 'Scale and grouped tokens' },
  { id: 'elevation', label: 'Elevation', note: 'Multi-layer shadows' }
]

export const ALL_MODULES: ExportModule[] = EXPORT_MODULES.map((m) => m.id)

export const FORMATS: ReadonlyArray<{ id: ExportFormat; label: string; file: string; note: string }> = [
  { id: 'css', label: 'CSS variables', file: 'baseline-tokens.css', note: 'Custom properties on :root, with a dark block' },
  { id: 'json', label: 'Design tokens JSON (W3C)', file: 'baseline-tokens.json', note: 'For the Baseline Figma plugin, Tokens Studio and Style Dictionary' }
]

/** Semantic tokens point at the ramps, so choosing them always brings the ramps along. */
export function normaliseSelection(selection: ExportModule[]): ExportModule[] {
  const set = new Set(selection)
  if (set.has('semantic')) set.add('ramps')
  return ALL_MODULES.filter((m) => set.has(m))
}

const GROUP: Record<ExportModule, string> = {
  ramps: 'Primitives', semantic: 'Semantic', type: 'Type', grids: 'Grid', spacing: 'Spacing', elevation: 'Elevation'
}

export interface BuiltExport {
  text: string
  filename: string
  mime: string
  /** Tokens in the file. */
  count: number
  lines: number
}

/** `input` is one theme's data, or a list of named themes (several themes go into one file). */
export function buildExport(input: ExportInput | NamedTheme[], format: ExportFormat, selection: ExportModule[]): BuiltExport {
  const themes: NamedTheme[] = Array.isArray(input) ? input : [{ name: 'Default', data: input }]
  const chosen = normaliseSelection(selection)
  const sections = themedSections(themes).filter((s) => chosen.includes(s.id))
  const count = sections.reduce((n, s) => n + s.count, 0)
  const file = FORMATS.find((f) => f.id === format)!.file
  let text: string
  if (format === 'css') {
    text = sections.length ? sections.map((s) => `/* ${s.title} */\n${s.css}`).join('\n\n') + '\n' : ''
  } else {
    const keep = new Set(chosen.map((m) => GROUP[m]))
    const pick = (data: ExportInput) => {
      const doc = buildFigmaTokens(data) as Record<string, unknown>
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(doc)) if (k.startsWith('$') || keep.has(k)) out[k] = v
      return out
    }
    const out = themes.length === 1
      ? pick(themes[0].data)
      : { $extensions: { 'com.baseline': { themes: themes.map((t) => t.name) } }, Themes: Object.fromEntries(themes.map((t) => [t.name, pick(t.data)])) }
    text = chosen.length ? JSON.stringify(out, null, 2) + '\n' : ''
  }
  return { text, filename: file, mime: format === 'css' ? 'text/css' : 'application/json', count, lines: text ? text.split('\n').length - 1 : 0 }
}
