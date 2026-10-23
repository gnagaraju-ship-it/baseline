/**
 * Column grid maths. Ported from BPS, PRESETS, fmt and the renderVals maths in html/grids.html.
 */
import type { Unit } from './typeScale'

export type BreakpointKey = 'xxl' | 'md' | 'xs'

export interface Breakpoint {
  key: BreakpointKey
  label: string
  width: number
  /** Sidebar width at this breakpoint when the sidebar is on. */
  sidebar: number
  sidebarState: string
  name: string
}

export const BREAKPOINTS: readonly Breakpoint[] = [
  { key: 'xxl', label: 'XXL', width: 1400, sidebar: 272, sidebarState: 'Expanded', name: 'Expanded' },
  { key: 'md', label: 'MD', width: 768, sidebar: 72, sidebarState: 'Collapsed', name: 'Collapsed rail' },
  { key: 'xs', label: 'XS', width: 390, sidebar: 0, sidebarState: 'Hidden', name: 'Compact' }
]

export type GridPresetKey = 'standard' | 'dense' | 'airy' | 'custom'

/** Gutter (g) and side margin (m) per breakpoint in the order XXL, MD, XS. */
export const GRID_PRESETS: Record<Exclude<GridPresetKey, 'custom'>, { label: string; g: [number, number, number]; m: [number, number, number] }> = {
  standard: { label: 'Standard', g: [24, 16, 16], m: [16, 16, 16] },
  dense: { label: 'Dense', g: [16, 12, 8], m: [12, 12, 12] },
  airy: { label: 'Airy', g: [32, 24, 16], m: [32, 24, 20] }
}

export const MAX_CONTENT_WIDTH = 1200
export const MAX_COLUMNS = 24
export const MAX_GUTTER = 96

export interface GridSettings {
  /** Index into Website, Web app, Tablet, Phone. Stored only, as in the mockup. */
  platform: number
  sidebar: boolean
  floating: boolean
  maxWidth: boolean
  preset: GridPresetKey
  on: Record<BreakpointKey, boolean>
  active: BreakpointKey
  columns: Record<BreakpointKey, number>
  gutter: Record<BreakpointKey, number>
}

export function defaultGridSettings(): GridSettings {
  return {
    platform: 1, sidebar: true, floating: false, maxWidth: false, preset: 'standard',
    on: { xxl: true, md: true, xs: true }, active: 'xxl',
    columns: { xxl: 12, md: 8, xs: 4 }, gutter: { xxl: 24, md: 16, xs: 16 }
  }
}

export const clampColumns = (n: number) => Math.max(1, Math.min(MAX_COLUMNS, Math.round(n) || 1))
export const clampGutter = (n: number) => Math.max(0, Math.min(MAX_GUTTER, Math.round(n) || 0))

export function breakpoint(key: BreakpointKey): Breakpoint {
  return BREAKPOINTS.find((b) => b.key === key)!
}

/** Margin for a breakpoint; Custom falls back to the Standard margins. */
export function marginFor(preset: GridPresetKey, key: BreakpointKey): number {
  const set = GRID_PRESETS[preset === 'custom' ? 'standard' : preset]
  return set.m[BREAKPOINTS.findIndex((b) => b.key === key)]
}

export interface GridLayout {
  bp: Breakpoint
  columns: number
  gutter: number
  margin: number
  /** Sidebar width actually shown (0 when the sidebar is off). */
  sidebarWidth: number
  /** Width taken away from the columns by the sidebar (0 when floating). */
  reserved: number
  available: number
  content: number
  column: number
  cols: Array<{ left: number; width: number }>
  /** Gap markers: the two side margins plus the gutters between columns. */
  gaps: Array<{ at: number; value: number; margin: boolean }>
}

export function computeGrid(s: GridSettings, key: BreakpointKey): GridLayout {
  const bp = breakpoint(key)
  const n = clampColumns(s.columns[key])
  const g = clampGutter(s.gutter[key])
  const m = marginFor(s.preset, key)
  const sidebarWidth = s.sidebar ? bp.sidebar : 0
  const reserved = s.floating ? 0 : sidebarWidth
  const available = bp.width - reserved - 2 * m
  const content = s.maxWidth ? Math.min(available, MAX_CONTENT_WIDTH) : available
  const start = reserved + m + (available - content) / 2
  const column = (content - (n - 1) * g) / n
  const cols: GridLayout['cols'] = []
  const gaps: GridLayout['gaps'] = [{ at: reserved + m / 2, value: m, margin: true }]
  for (let i = 0; i < n; i++) {
    const left = start + i * (column + g)
    cols.push({ left, width: column })
    if (i < n - 1 && g > 0) gaps.push({ at: left + column + g / 2, value: g, margin: false })
  }
  gaps.push({ at: bp.width - m / 2, value: m, margin: true })
  return { bp, columns: n, gutter: g, margin: m, sidebarWidth, reserved, available, content, column, cols, gaps }
}

export function formatPx(px: number, unit: Unit): string {
  if (unit === 'rem') return `${+(px / 16).toFixed(2)}rem`
  if (unit === 'pt') return `${+(px * 0.75).toFixed(1)}pt`
  return `${+px.toFixed(1)}px`
}

/** Gutter labels drop their unit on dense grids (more than 8 columns) to stay legible. */
export function gapLabel(value: number, margin: boolean, columns: number, unit: Unit): string {
  return !margin && columns > 8 ? String(value) : formatPx(value, unit)
}

export function gridStats(l: GridLayout, unit: Unit): Array<{ k: string; v: string; accent: boolean }> {
  const rows: Array<[string, string]> = [
    ['VIEWPORT', formatPx(l.bp.width, unit)],
    ['SIDEBAR', l.reserved ? `−${formatPx(l.reserved, unit)}` : formatPx(0, unit)],
    ['MARGINS', `−${formatPx(l.bp.width - l.reserved - l.content, unit)}`],
    ['CONTENT', formatPx(l.content, unit)],
    ['COLUMNS', String(l.columns)],
    ['GUTTER', formatPx(l.gutter, unit)],
    ['COLUMN', formatPx(l.column, unit)]
  ]
  return rows.map(([k, v], i) => ({ k, v, accent: i === 6 }))
}

export function gridTitle(l: GridLayout, sidebar: boolean): string {
  return `${l.bp.label} · ${sidebar ? l.bp.name : 'No sidebar'}`
}

export function gridDescription(l: GridLayout, s: GridSettings, unit: Unit): string {
  const col = formatPx(l.column, unit)
  if (s.sidebar && l.sidebarWidth) {
    return s.floating
      ? 'Sidebar floats over the content, so the columns use the full width.'
      : `Sidebar width is reserved. The columns divide what is left, so each one is ${col}.`
  }
  return `No sidebar reserved. The columns divide the full width, so each one is ${col}.`
}

export function sidebarChip(l: GridLayout, s: GridSettings, unit: Unit): { state: string; width: string } {
  return { state: s.sidebar ? l.bp.sidebarState : 'Off', width: formatPx(l.sidebarWidth, unit) }
}

/** Per-breakpoint custom properties for the enabled breakpoints, always in px. */
export function toGridCss(s: GridSettings): string {
  const lines: string[] = []
  for (const bp of BREAKPOINTS) {
    if (!s.on[bp.key]) continue
    const l = computeGrid(s, bp.key)
    lines.push(
      `  --grid-${bp.key}-width: ${bp.width}px;`,
      `  --grid-${bp.key}-columns: ${l.columns};`,
      `  --grid-${bp.key}-gutter: ${l.gutter}px;`,
      `  --grid-${bp.key}-margin: ${l.margin}px;`,
      `  --grid-${bp.key}-sidebar: ${l.sidebarWidth}px;`,
      `  --grid-${bp.key}-column: ${+l.column.toFixed(2)}px;`
    )
  }
  return `:root {\n${lines.join('\n')}\n}`
}
