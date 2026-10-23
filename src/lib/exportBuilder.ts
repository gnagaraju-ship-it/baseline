/**
 * What the Export dialog produces: the chosen modules, in the chosen format.
 */
import { exportSections, type ExportInput, type ExportModule } from './exportAll'
import { buildFigmaTokens } from './figmaExport'
import { figmaPluginScript } from './figmaScript'

export type ExportFormat = 'css' | 'json' | 'figma'

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
  { id: 'css', label: 'CSS variables', file: 'omni-tokens.css', note: 'Custom properties on :root, with a dark block' },
  { id: 'figma', label: 'Figma Variables (plugin script)', file: 'omni-figma-variables.js', note: 'Creates the variables and shadow styles inside your Figma file' },
  { id: 'json', label: 'Design tokens JSON (W3C)', file: 'omni-tokens.json', note: 'For Tokens Studio and Style Dictionary. Figma cannot open it directly.' }
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

export function buildExport(input: ExportInput, format: ExportFormat, selection: ExportModule[]): BuiltExport {
  const chosen = normaliseSelection(selection)
  const sections = exportSections(input).filter((s) => chosen.includes(s.id))
  const count = sections.reduce((n, s) => n + s.count, 0)
  const file = FORMATS.find((f) => f.id === format)!.file
  let text: string
  if (format === 'css') {
    text = sections.length ? sections.map((s) => `/* ${s.title} */\n${s.css}`).join('\n\n') + '\n' : ''
  } else if (format === 'figma') {
    text = chosen.length ? figmaPluginScript(input, chosen) : ''
  } else {
    const doc = buildFigmaTokens(input) as Record<string, unknown>
    const keep = new Set(chosen.map((m) => GROUP[m]))
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(doc)) if (k.startsWith('$') || keep.has(k)) out[k] = v
    text = chosen.length ? JSON.stringify(out, null, 2) + '\n' : ''
  }
  return { text, filename: file, mime: format === 'css' ? 'text/css' : format === 'figma' ? 'text/javascript' : 'application/json', count, lines: text ? text.split('\n').length - 1 : 0 }
}
