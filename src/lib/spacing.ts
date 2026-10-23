/**
 * Spacing scale and tokens. Ported from BASES, TOKENS, initOn, fmt and renderVals in html/spacing.html.
 */
import { responsiveBlocks } from './breakpointCss'
import { BREAKPOINTS, computeGrid, type BreakpointKey, type GridSettings } from './grid'
import type { Unit } from './typeScale'

export type SpacingBase = 'b2' | 'b4' | 'b8' | 'custom'

export const SPACING_BASES: Record<SpacingBase, { label: string; steps: number[]; off: number[] }> = {
  b2: { label: '2px base', steps: [0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64], off: [14, 36] },
  b4: { label: '4px base', steps: [0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120], off: [6, 10, 28, 72, 88, 104] },
  b8: { label: '8px base', steps: [0, 4, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160], off: [56, 112] },
  custom: { label: 'Custom', steps: [0, 4, 8, 12, 16, 24, 32, 48, 64, 96], off: [] }
}

export const MAX_CUSTOM = 400

export interface SpacingSettings {
  base: SpacingBase
  /** Value → enabled. */
  on: Record<number, boolean>
  /** Custom values added by the user. */
  extra: number[]
  /** Same as Grid: reuse the Grid breakpoints. */
  same: boolean
  /** Independent breakpoint switches, used when `same` is off. */
  bp: Record<BreakpointKey, boolean>
}

export function initOn(base: SpacingBase): Record<number, boolean> {
  const o: Record<number, boolean> = {}
  for (const v of SPACING_BASES[base].steps) o[v] = !SPACING_BASES[base].off.includes(v)
  return o
}

export function defaultSpacingSettings(): SpacingSettings {
  return { base: 'b4', on: initOn('b4'), extra: [], same: true, bp: { xxl: true, md: true, xs: true } }
}

/** Base steps plus custom values, unique and ascending. */
export function scaleSteps(base: SpacingBase, extra: number[]): number[] {
  return [...new Set([...SPACING_BASES[base].steps, ...extra])].sort((a, b) => a - b)
}

export function onValues(steps: number[], on: Record<number, boolean>): number[] {
  return steps.filter((v) => on[v])
}

/** Integer 0–400, or null. */
export function parseCustom(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null
  const n = parseInt(text, 10)
  return n >= 0 && n <= MAX_CUSTOM ? n : null
}

/** Breakpoints that get spacing values: Grid's enabled ones, or the independent switches. */
export function spacingBreakpoints(s: SpacingSettings, grid: GridSettings): BreakpointKey[] {
  return BREAKPOINTS.filter((b) => (s.same ? grid.on[b.key] : s.bp[b.key])).map((b) => b.key)
}

/** [XXL, MD, XS] defaults for the tokens that are not derived from Grid. */
const FIXED: Array<[string, Array<[string, [number, number, number]]>]> = [
  ['SECTION', [['section-y', [96, 64, 48]], ['section-x', [64, 32, 16]]]],
  ['STACK', [['stack-xs', [4, 4, 4]], ['stack-sm', [8, 8, 8]], ['stack-md', [16, 16, 12]], ['stack-lg', [24, 20, 16]], ['stack-xl', [40, 32, 24]]]],
  ['INSET', [['inset-sm', [12, 12, 8]], ['inset-md', [16, 16, 12]], ['inset-lg', [24, 20, 16]]]]
]

export interface TokenCell { bp: BreakpointKey; value: number; offScale: boolean }
export interface TokenRowData { name: string; cells: TokenCell[] }
export interface TokenGroup { name: string; rows: TokenRowData[] }

/** Token groups for the given breakpoints; a value not among the enabled steps is off-scale. */
export function spacingTokens(grid: GridSettings, bps: BreakpointKey[], enabled: number[]): TokenGroup[] {
  const idx = (k: BreakpointKey) => BREAKPOINTS.findIndex((b) => b.key === k)
  const cell = (bp: BreakpointKey, value: number): TokenCell => ({ bp, value, offScale: !enabled.includes(value) })
  const gridGroup: TokenGroup = {
    name: 'GRID',
    rows: [
      { name: 'grid-margin', cells: bps.map((k) => cell(k, computeGrid(grid, k).margin)) },
      { name: 'grid-gutter', cells: bps.map((k) => cell(k, computeGrid(grid, k).gutter)) }
    ]
  }
  const fixed = FIXED.map(([name, rows]) => ({
    name,
    rows: rows.map(([n, vals]) => ({ name: n, cells: bps.map((k) => cell(k, vals[idx(k)])) }))
  }))
  return [gridGroup, ...fixed]
}

export function formatSpacing(px: number, unit: Unit): string {
  if (unit === 'rem') return `${+(px / 16).toFixed(3)}rem`
  if (unit === 'pt') return `${+(px * 0.75).toFixed(1)}pt`
  return `${px}px`
}

export function barWidth(px: number): number {
  return Math.min(60, Math.max(2, px / 2))
}

/** spacing.css: one --space-N per enabled step, then each token per enabled breakpoint. Always px. */
export function toSpacingCss(enabled: number[], groups: TokenGroup[]): string {
  const lines = enabled.map((v) => `  --space-${v}: ${v}px;`)
  for (const g of groups) for (const r of g.rows) for (const c of r.cells) lines.push(`  --${r.name}-${c.bp}: ${c.value}px;`)
  const fixed = `:root {\n${lines.join('\n')}\n}`
  // The same tokens as plain variables that follow the breakpoint (mobile first). A breakpoint without its own value
  // uses the nearest larger one.
  const rows = groups.flatMap((g) => g.rows).filter((r) => r.cells.length)
  if (!rows.length) return fixed
  const at = (r: TokenRowData, k: BreakpointKey) => (r.cells.find((c) => c.bp === k) ?? r.cells.find((c) => c.bp === 'xxl') ?? r.cells[0]).value
  const per = Object.fromEntries(BREAKPOINTS.map((bp) => [bp.key, rows.map((r) => `  --${r.name}: ${at(r, bp.key)}px;`)])) as Record<BreakpointKey, string[]>
  return `${fixed}\n\n${responsiveBlocks([], per)}`
}
