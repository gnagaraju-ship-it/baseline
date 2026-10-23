/**
 * Colour maths for Omni palettes.
 * Ported from the reference logic in html/index.html (EXACT, gen, ramp) and html/contrast.html.
 * Hex values are stored upper-case without the leading "#", as in the mockups.
 */

export const STEP_COUNT = 16

export type RGB = [number, number, number]

/** Normalise a user-typed hex ("#9d00d6", "9D00D6") to "9D00D6", or null when it is not six hex digits. */
export function norm(input: string | null | undefined): string | null {
  const h = String(input ?? '').trim().replace(/^#/, '')
  return /^[0-9a-fA-F]{6}$/.test(h) ? h.toUpperCase() : null
}

export function rgb(hex: string): RGB {
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB
}

export function hex(channels: readonly number[]): string {
  return channels
    .map((v) => {
      const c = Math.round(Math.max(0, Math.min(255, v)))
      return (c < 16 ? '0' : '') + c.toString(16)
    })
    .join('')
    .toUpperCase()
}

/** Blend `hexColour` toward the channel value `target` (255 = white, 0 = black) by `amount` (0..1). */
export function mix(hexColour: string, target: number, amount: number): string {
  return hex(rgb(hexColour).map((v) => v + (target - v) * amount))
}

/**
 * Generate a 16-step ramp whose step `base` (1-based) is exactly `hexColour`.
 * Lighter steps blend toward white, darker steps toward black.
 * NOTE: blending is linear in RGB, which is the "muddy dark steps" risk named in the brief;
 * it is isolated here so the algorithm can be replaced without touching screens.
 */
export function gen(hexColour: string, base: number): string[] {
  const out: string[] = []
  const b = base - 1
  const n = STEP_COUNT - 1 - b
  for (let i = 0; i < STEP_COUNT; i++) {
    if (i < b) out.push(mix(hexColour, 255, 0.96 * Math.pow(1 - i / b, 0.9)))
    else if (i === b) out.push(hexColour)
    else out.push(mix(hexColour, 0, 0.84 * Math.pow((i - b) / n, 0.95)))
  }
  return out
}

/** Hand-tuned ramps used when the input equals the default colour. */
export const EXACT = {
  primary: ['FBF4FF', 'F8EBFF', 'F3DEFF', 'EDCDFF', 'E4B7FF', 'DB9DFF', 'D07DFF', 'C252FB', 'AD2CE8', '9D00D6', '7C00AD', '65008F', '4F0072', '3B0056', '29003F', '1C002D'],
  neutral: ['F9FAFB', 'F5F6F8', 'EEF0F2', 'E5E7EB', 'D8DBE0', 'BFC4CC', '9CA3AF', '7B828F', '606876', '4B5563', '3E4857', '2F3948', '1F2937', '161E2C', '0B1220', '030712'],
  info: ['F3F7FF', 'E9F0FF', 'DBE7FF', 'C9DBFF', 'B2CCFF', '97BAFF', '78A6FF', '538BFF', '3070F7', '2563EB', '0A48BF', '0039A1', '002C7E', '00205E', '001644', '000D30']
} as const

export type TextKey = 'primary' | 'info' | 'success' | 'caution' | 'warning' | 'critical'
export type SemanticKey = Exclude<TextKey, 'primary'>

export const DEFAULT_HEX: Record<TextKey, string> = {
  primary: '9D00D6',
  info: '2563EB',
  success: '1F9D55',
  caution: 'EAB308',
  warning: 'F97316',
  critical: 'DC2626'
}

export const DEFAULT_SECONDARY = '4852E5'

export type NeutralPreset = 'gray' | 'slate' | 'zinc' | 'stone'
export const NEUTRAL_PRESETS: Record<NeutralPreset, { label: string; hex: string }> = {
  gray: { label: 'Gray', hex: '606876' },
  slate: { label: 'Slate', hex: '64748B' },
  zinc: { label: 'Zinc', hex: '71717A' },
  stone: { label: 'Stone', hex: '78716C' }
}

export type PaletteKey = 'primary' | 'secondary' | 'neutral' | SemanticKey

export interface Palette {
  key: PaletteKey
  name: string
  group: 'brand' | 'neutral' | 'semantic'
  /** 1-based index of the step that equals the input colour. */
  base: number
  /** The input (base) colour. */
  hex: string
  steps: string[]
}

export interface PaletteSettings {
  /** Raw text as typed by the user; invalid text falls back to the default colour. */
  text: Record<TextKey, string>
  /** null = secondary not added. */
  secondary: string | null
  neutral: { enabled: boolean; preset: NeutralPreset }
  semanticEnabled: boolean
}

export function defaultSettings(): PaletteSettings {
  return {
    text: {
      primary: '#9d00d6',
      info: '#2563EB',
      success: '#1F9D55',
      caution: '#EAB308',
      warning: '#F97316',
      critical: '#DC2626'
    },
    secondary: null,
    neutral: { enabled: true, preset: 'gray' },
    semanticEnabled: true
  }
}

interface Def {
  key: PaletteKey
  name: string
  base: number
  group: Palette['group']
}

const DEFS: Def[] = [
  { key: 'primary', name: 'Primary', base: 10, group: 'brand' },
  { key: 'secondary', name: 'Secondary', base: 10, group: 'brand' },
  { key: 'neutral', name: 'Neutral', base: 9, group: 'neutral' },
  { key: 'info', name: 'Info', base: 10, group: 'semantic' },
  { key: 'success', name: 'Success', base: 9, group: 'semantic' },
  { key: 'caution', name: 'Caution', base: 9, group: 'semantic' },
  { key: 'warning', name: 'Warning', base: 9, group: 'semantic' },
  { key: 'critical', name: 'Critical', base: 9, group: 'semantic' }
]

function inputHex(key: PaletteKey, s: PaletteSettings): string {
  if (key === 'neutral') return NEUTRAL_PRESETS[s.neutral.preset].hex
  if (key === 'secondary') return norm(s.secondary) ?? DEFAULT_SECONDARY
  return norm(s.text[key]) ?? DEFAULT_HEX[key]
}

function rampFor(def: Def, s: PaletteSettings): { hex: string; steps: string[] } {
  const h = inputHex(def.key, s)
  if (def.key === 'neutral' && s.neutral.preset === 'gray') return { hex: h, steps: [...EXACT.neutral] }
  if ((def.key === 'primary' || def.key === 'info') && h === DEFAULT_HEX[def.key]) return { hex: h, steps: [...EXACT[def.key]] }
  return { hex: h, steps: gen(h, def.base) }
}

/** The palettes shown for the given settings, in display order. */
export function buildPalettes(s: PaletteSettings): Palette[] {
  return DEFS.filter((d) => {
    if (d.key === 'secondary') return s.secondary !== null
    if (d.group === 'neutral') return s.neutral.enabled
    if (d.group === 'semantic') return s.semanticEnabled
    return true
  }).map((d) => {
    const { hex: h, steps } = rampFor(d, s)
    return { key: d.key, name: d.name, group: d.group, base: d.base, hex: h, steps }
  })
}

export interface TokenRow {
  name: string
  hex: string
}

/** CSS custom property per step, e.g. --primary-10. */
export function tokenRows(palettes: Palette[]): TokenRow[] {
  return palettes.flatMap((p) => p.steps.map((h, i) => ({ name: `--${p.key}-${i + 1}`, hex: h })))
}

export function toCss(rows: TokenRow[]): string {
  return `:root {\n${rows.map((r) => `  ${r.name}: #${r.hex};`).join('\n')}\n}`
}

/** Neutral mini swatches shown in the preset field (steps 2, 6, 9, 12, 15). */
export function neutralMini(neutralSteps: string[]): string[] {
  return [1, 5, 8, 11, 14].map((i) => neutralSteps[i])
}
