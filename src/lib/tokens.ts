/**
 * Semantic tokens (Backgrounds, Text, Borders) mapped onto palette ramp steps.
 * Ported from RAW, paint, lcFor, ALPHA and CHIPS in html/tokens.html, but resolved against the
 * user's own palettes instead of the mockup's fixed defaults.
 */
import type { Palette, PaletteKey } from './colour'
import { apcaLc } from './contrast'

export type PaletteRef = PaletteKey | 'blackA' | 'whiteA'
export type Mode = 'light' | 'dark'
export type TokenGroup = 'bg' | 'text' | 'border'

/**
 * s = surface, f = fill, t = text, o = text on fill, b = border, a = alpha overlay.
 * The kind decides how the Lc badge is computed (see lcFor).
 */
export type TokenKind = 's' | 'f' | 't' | 'o' | 'b' | 'a'

export interface TokenDef {
  name: string
  group: TokenGroup
  kind: TokenKind
  /** Default refs like "neutral-3" (palette key, 1-based step). */
  light: string
  dark: string
}

export const ALPHA = [0.02, 0.04, 0.06, 0.08, 0.1, 0.12, 0.16, 0.2, 0.28, 0.36, 0.44, 0.52, 0.6, 0.7, 0.8, 0.9] as const

export const GROUP_TITLES: Record<TokenGroup, string> = { bg: 'Backgrounds', text: 'Text', border: 'Borders' }

const RAW: Record<TokenGroup, string[]> = {
  bg: [
    'bg|s|neutral-3|neutral-15', 'bg-inverse|s|neutral-15|neutral-3', 'bg-surface|s|neutral-1|neutral-14', 'bg-surface-hover|s|neutral-2|neutral-13',
    'bg-surface-active|s|neutral-3|neutral-12', 'bg-surface-selected|s|neutral-3|neutral-12', 'bg-surface-secondary|s|neutral-2|neutral-13',
    'bg-surface-secondary-hover|s|neutral-3|neutral-12', 'bg-surface-secondary-active|s|neutral-4|neutral-11', 'bg-surface-tertiary|s|neutral-3|neutral-12',
    'bg-surface-tertiary-hover|s|neutral-4|neutral-11', 'bg-surface-tertiary-active|s|neutral-5|neutral-10', 'bg-surface-disabled|a|blackA-5|whiteA-4',
    'bg-surface-brand|s|primary-1|primary-14', 'bg-surface-brand-hover|s|primary-2|primary-13', 'bg-surface-brand-active|s|primary-3|primary-12',
    'bg-fill|f|primary-10|primary-9', 'bg-fill-hover|f|primary-11|primary-8', 'bg-fill-active|f|primary-12|primary-7'
  ],
  text: [
    'text|t|neutral-16|neutral-2', 'text-secondary|t|neutral-11|neutral-6', 'text-tertiary|t|neutral-9|neutral-8', 'text-disabled|t|neutral-7|neutral-10',
    'text-brand|t|primary-10|primary-7', 'text-on-fill|o|neutral-1|neutral-1', 'text-link|t|info-10|info-7', 'text-info|t|info-11|info-6',
    'text-success|t|success-11|success-6', 'text-caution|t|caution-12|caution-6', 'text-warning|t|warning-11|warning-6', 'text-critical|t|critical-10|critical-7'
  ],
  border: [
    'border|b|neutral-4|neutral-12', 'border-secondary|b|neutral-5|neutral-11', 'border-strong|b|neutral-7|neutral-9', 'border-brand|b|primary-10|primary-8',
    'border-focus|b|info-9|info-8', 'border-critical|b|critical-9|critical-8', 'border-disabled|a|blackA-6|whiteA-5'
  ]
}

const SEMANTIC_HUES = ['info', 'success', 'caution', 'warning', 'critical'] as const
for (const k of SEMANTIC_HUES) {
  RAW.bg.push(
    `bg-surface-${k}|s|${k}-3|${k}-14`,
    `bg-surface-${k}-hover|s|${k}-4|${k}-13`,
    `bg-surface-${k}-active|s|${k}-5|${k}-12`,
    `bg-fill-${k}|f|${k}-10|${k}-9`
  )
}

export const TOKEN_DEFS: TokenDef[] = (Object.keys(RAW) as TokenGroup[]).flatMap((group) =>
  RAW[group].map((line) => {
    const [name, kind, light, dark] = line.split('|')
    return { name, group, kind: kind as TokenKind, light, dark }
  })
)

export function parseRef(ref: string): { palette: PaletteRef; step: number } {
  const i = ref.lastIndexOf('-')
  return { palette: ref.slice(0, i) as PaletteRef, step: parseInt(ref.slice(i + 1), 10) }
}

export function refLabel(ref: string): string {
  const { palette, step } = parseRef(ref)
  const p = palette === 'blackA' ? 'black-alpha' : palette === 'whiteA' ? 'white-alpha' : palette
  return `${p}-${step}`
}

const CHECKER = 'repeating-conic-gradient(#E4E4E7 0 25%, #FFFFFF 0 50%) 0 0 / 8px 8px'

export interface Paint {
  css: string
  hex: string | null
}

/** CSS paint and hex for a palette step (index is 0-based). Alpha palettes have no hex. */
export function paintFor(palette: PaletteRef, index: number, palettes: Palette[]): Paint | null {
  if (palette === 'blackA') return { css: `linear-gradient(rgba(0,0,0,${ALPHA[index]}), rgba(0,0,0,${ALPHA[index]})), ${CHECKER}`, hex: null }
  if (palette === 'whiteA') return { css: `linear-gradient(rgba(255,255,255,${ALPHA[index]}), rgba(255,255,255,${ALPHA[index]})), ${CHECKER}`, hex: null }
  const p = palettes.find((x) => x.key === palette)
  const h = p?.steps[index]
  return h ? { css: `#${h}`, hex: h } : null
}

/**
 * Lc badge value for a colour used by a token of the given kind.
 * Surfaces and fills: the stronger of neutral-16 text or white on the colour.
 * Text on fill: the colour against the primary fill (step 10 light, 9 dark).
 * Text and borders: the colour against the page background (neutral-1 light, neutral-14 dark).
 * Returns null for alpha colours or when the palette needed for the comparison is missing.
 */
export function lcFor(kind: TokenKind, mode: Mode, hexColour: string | null, palettes: Palette[]): number | null {
  if (!hexColour) return null
  const neutral = palettes.find((p) => p.key === 'neutral')?.steps
  const primary = palettes.find((p) => p.key === 'primary')?.steps
  if (kind === 's' || kind === 'f') {
    if (!neutral) return null
    return Math.round(Math.max(Math.abs(apcaLc(neutral[15], hexColour)), Math.abs(apcaLc('FFFFFF', hexColour))))
  }
  if (kind === 'o') {
    if (!primary) return null
    return Math.round(Math.abs(apcaLc(hexColour, mode === 'light' ? primary[9] : primary[8])))
  }
  if (!neutral) return null
  return Math.round(Math.abs(apcaLc(hexColour, mode === 'light' ? neutral[0] : neutral[13])))
}

export interface ResolvedCell {
  ref: string
  label: string
  palette: PaletteRef
  /** 0-based step index. */
  index: number
  paint: string
  hex: string | null
  lc: number | null
  /** False when the palette this ref points at has been removed. */
  available: boolean
  overridden: boolean
}

export interface ResolvedToken {
  def: TokenDef
  light: ResolvedCell
  dark: ResolvedCell
}

export function overrideKey(name: string, mode: Mode): string {
  return `${name}|${mode}`
}

function resolveCell(def: TokenDef, mode: Mode, overrides: Record<string, string>, palettes: Palette[]): ResolvedCell {
  const overridden = overrides[overrideKey(def.name, mode)] !== undefined
  const ref = overrides[overrideKey(def.name, mode)] ?? def[mode]
  const { palette, step } = parseRef(ref)
  const index = step - 1
  const paint = paintFor(palette, index, palettes)
  return {
    ref,
    label: refLabel(ref),
    palette,
    index,
    paint: paint?.css ?? 'transparent',
    hex: paint?.hex ?? null,
    lc: paint ? lcFor(def.kind, mode, paint.hex, palettes) : null,
    available: paint !== null,
    overridden
  }
}

export function resolveToken(def: TokenDef, overrides: Record<string, string>, palettes: Palette[]): ResolvedToken {
  return { def, light: resolveCell(def, 'light', overrides, palettes), dark: resolveCell(def, 'dark', overrides, palettes) }
}

export function isResolved(t: ResolvedToken): boolean {
  return t.light.available && t.dark.available
}

export interface TokenSet {
  tokens: ResolvedToken[]
  /** Tokens whose light and dark refs both exist. */
  resolvedCount: number
  /** Palettes referenced by tokens but not present, in display order. */
  missing: PaletteKey[]
}

const DISPLAY_ORDER: PaletteKey[] = ['primary', 'secondary', 'neutral', 'info', 'success', 'caution', 'warning', 'critical']

export function resolveAll(palettes: Palette[], overrides: Record<string, string>): TokenSet {
  const tokens = TOKEN_DEFS.map((d) => resolveToken(d, overrides, palettes))
  const missing = new Set<PaletteKey>()
  for (const t of tokens) {
    for (const c of [t.light, t.dark]) {
      if (!c.available && c.palette !== 'blackA' && c.palette !== 'whiteA') missing.add(c.palette)
    }
  }
  return {
    tokens,
    resolvedCount: tokens.filter(isResolved).length,
    missing: DISPLAY_ORDER.filter((k) => missing.has(k))
  }
}

/** Palette chips offered by the picker: palettes that exist, then black and white alpha. */
export function pickerChips(palettes: Palette[]): Array<{ key: PaletteRef; label: string }> {
  const order: PaletteKey[] = ['neutral', 'primary', 'secondary', 'info', 'success', 'caution', 'warning', 'critical']
  const present = order.filter((k) => palettes.some((p) => p.key === k)).map((k) => ({ key: k as PaletteRef, label: k }))
  return [...present, { key: 'blackA', label: 'black α' }, { key: 'whiteA', label: 'white α' }]
}

function cssValue(c: ResolvedCell): string {
  if (c.palette === 'blackA') return `rgb(0 0 0 / ${ALPHA[c.index]})`
  if (c.palette === 'whiteA') return `rgb(255 255 255 / ${ALPHA[c.index]})`
  return `var(--${c.palette}-${c.index + 1})`
}

/** Light values in :root, dark values in [data-theme="dark"]. Tokens with a removed palette are skipped. */
export function toTokenCss(tokens: ResolvedToken[]): string {
  const ok = tokens.filter(isResolved)
  const light = ok.map((t) => `  --${t.def.name}: ${cssValue(t.light)};`).join('\n')
  const dark = ok.map((t) => `  --${t.def.name}: ${cssValue(t.dark)};`).join('\n')
  return `:root {\n${light}\n}\n\n[data-theme="dark"] {\n${dark}\n}`
}
