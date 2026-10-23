/**
 * Contrast maths: WCAG 2 ratio and APCA Lc.
 * Ported from html/contrast.html (ratio, apca, TH, CHECKS). Hex values have no leading "#".
 */
import { rgb } from './colour'

function lin(v: number): number {
  const c = v / 255
  // WCAG 2.1 uses 0.04045; the mockup used the older 0.03928. Results differ by far less than 0.01.
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** WCAG 2 relative luminance. */
export function luminance(hexColour: string): number {
  const [r, g, b] = rgb(hexColour)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** WCAG 2 contrast ratio, 1..21. */
export function wcagRatio(a: string, b: string): number {
  const x = luminance(a)
  const y = luminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

export type Grade = 'AAA' | 'AA' | 'AA Large' | 'Fail'

export function grade(ratio: number): Grade {
  return ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA Large' : 'Fail'
}

function apcaY(hexColour: string): number {
  const [r, g, b] = rgb(hexColour)
  return 0.2126729 * Math.pow(r / 255, 2.4) + 0.7151522 * Math.pow(g / 255, 2.4) + 0.072175 * Math.pow(b / 255, 2.4)
}

function clampBlack(y: number): number {
  return y > 0.022 ? y : y + Math.pow(0.022 - y, 1.414)
}

/**
 * APCA lightness contrast (Lc) of text `txt` on background `bg`.
 * Positive = dark text on light background; negative = light text on dark.
 */
export function apcaLc(txt: string, bg: string): number {
  const t = clampBlack(apcaY(txt))
  const b = clampBlack(apcaY(bg))
  if (Math.abs(b - t) < 0.0005) return 0
  if (b > t) {
    const s = (Math.pow(b, 0.56) - Math.pow(t, 0.57)) * 1.14
    return s < 0.1 ? 0 : (s - 0.027) * 100
  }
  const s = (Math.pow(b, 0.65) - Math.pow(t, 0.62)) * 1.14
  return s > -0.1 ? 0 : (s + 0.027) * 100
}

export type Standard = 'apca' | 'wcag'

/** Threshold options: [minimum, label, description]. A minimum of 0 means "show every value". */
export const THRESHOLDS: Record<Standard, ReadonlyArray<readonly [number, string, string]>> = {
  apca: [
    [15, '15+', 'Non-text: dividers, outlines'],
    [30, '30+', 'Placeholder and disabled text'],
    [45, '45+', 'Large text, icons'],
    [60, '60+', 'Small text, UI elements'],
    [75, '75+', 'Body text (minimum)'],
    [90, '90+', 'Body text (preferred)'],
    [0, 'All', 'Show every value']
  ],
  wcag: [
    [3, '3 : 1', 'Large text, UI components'],
    [4.5, '4.5 : 1', 'AA body text'],
    [7, '7 : 1', 'AAA body text'],
    [0, 'All', 'Show every value']
  ]
}

/** Per-pair use-case checklist: [minimum, label, badge]. */
export const CHECKS: Record<Standard, ReadonlyArray<readonly [number, string, string]>> = {
  apca: [
    [45, 'Large text (≥24px bold or ≥36px regular)', '45+'],
    [60, 'Small text, UI elements', '60+'],
    [75, 'Body text (minimum)', '75+'],
    [90, 'Body text (preferred)', '90+']
  ],
  wcag: [
    [3, 'AA large text, UI components', '3:1'],
    [4.5, 'AA body text', '4.5:1'],
    [7, 'AAA body text', '7:1']
  ]
}
