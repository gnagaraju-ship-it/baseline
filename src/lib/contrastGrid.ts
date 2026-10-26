/**
 * Contrast grid data and scoring. Ported from renderVals in html/contrast.html:
 * rows are text colours, columns are backgrounds, both are White + the 16 ramp steps + Black.
 */
import type { Palette } from './colour'
import { apcaLc, wcagRatio, CHECKS, THRESHOLDS, type Standard } from './contrast'

export interface GridColour {
  /** Row/column header label: "White", "1".."16", "Black". */
  label: string
  /** Short header label: "W", "1".."16", "B". */
  short: string
  hex: string
}

export const DEFAULT_CELL: readonly [number, number] = [3, 10]
export const DEFAULT_THRESHOLD: Record<Standard, number> = { apca: 60, wcag: 4.5 }

export function gridColours(palette: Palette, labels?: readonly string[]): GridColour[] {
  const name = (i: number) => palette.labels?.[i] ?? labels?.[i] ?? String(i + 1)
  return [
    { label: 'White', short: 'W', hex: 'FFFFFF' },
    ...palette.steps.map((hex, i) => ({ label: name(i), short: name(i), hex })),
    { label: 'Black', short: 'B', hex: '000000' }
  ]
}

/** Signed APCA Lc (negative = light text on dark) or WCAG 2 ratio. Same colour scores 0. */
export function scoreFor(standard: Standard, text: string, bg: string): number {
  return standard === 'apca' ? apcaLc(text, bg) : wcagRatio(text, bg)
}

/** Value printed in a grid cell: whole Lc, or ratio to one decimal. */
export function cellText(standard: Standard, score: number): string {
  return standard === 'apca' ? String(Math.round(score)) : score.toFixed(1)
}

/** Value printed in the detail card: "Lc 62" or "4.52:1". */
export function detailText(standard: Standard, score: number): string {
  return standard === 'apca' ? `Lc ${Math.round(score)}` : `${score.toFixed(2)}:1`
}

/** True when the score meets the minimum. A minimum of 0 ("All") never highlights. */
export function meets(standard: Standard, score: number, min: number): boolean {
  if (min === 0) return false
  return (standard === 'apca' ? Math.abs(score) : score) >= min
}

export interface CheckResult {
  label: string
  need: string
  ok: boolean
}

export function checklist(standard: Standard, score: number): CheckResult[] {
  return CHECKS[standard].map(([min, label, need]) => ({ label, need, ok: (standard === 'apca' ? Math.abs(score) : score) >= min }))
}

export function thresholdInfo(standard: Standard, min: number) {
  const row = THRESHOLDS[standard].find((t) => t[0] === min) ?? THRESHOLDS[standard][0]
  return { label: row[1], description: row[2] }
}
