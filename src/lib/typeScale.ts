/**
 * Type scale maths. Ported from WEB, APPLE, modern, WEB_PRESETS, RATIOS, makeRow, fmtSize, trLabel and
 * the CSS builder in html/typography.html.
 */
import { responsiveBlocks } from './breakpointCss'

export type Unit = 'rem' | 'px' | 'pt'
export type PlatformIndex = 0 | 1 | 2 | 3
export type AppleStyle = 'hig' | 'modern'
export type ViewKey = 'desktop' | 'tablet' | 'mobile'
export type PresetKey = 'dense' | 'comfortable' | 'polaris'

export const PLATFORMS = ['Website', 'Web app', 'iOS', 'watchOS'] as const
export const isWeb = (p: PlatformIndex) => p < 2

export const RATIOS: ReadonlyArray<readonly [string, number]> = [
  ['Minor Second', 1.067], ['Major Second', 1.125], ['Minor Third', 1.2], ['Major Third', 1.25],
  ['Perfect Fourth', 1.333], ['Augmented Fourth', 1.414], ['Perfect Fifth', 1.5], ['Golden Ratio', 1.618]
]

export const WEB_PRESETS: Record<PresetKey, { label: string; base: number; ratio: number; grid: number }> = {
  dense: { label: 'Dense', base: 13, ratio: 1.125, grid: 4 },
  comfortable: { label: 'Comfortable', base: 16, ratio: 1.2, grid: 8 },
  polaris: { label: 'Polaris', base: 14, ratio: 1.25, grid: 4 }
}

export const WEIGHTS: ReadonlyArray<readonly [string, number]> = [['light', 300], ['medium', 500], ['semibold', 600], ['bold', 700], ['extrabold', 800]]

interface WebGroup { title: string; font: 'heading' | 'body'; lhFactor: number; tracking: number; weight: number; steps: ReadonlyArray<readonly [string, number]> }

const WEB: WebGroup[] = [
  { title: 'HEADING', font: 'heading', lhFactor: 1.2, tracking: -0.01, weight: 500, steps: [['heading-xl', 5], ['heading-lg', 4], ['heading-md', 3], ['heading-sm', 2]] },
  { title: 'BODY', font: 'body', lhFactor: 1.5, tracking: 0, weight: 400, steps: [['body-lg', 1], ['body-md', 0], ['body-sm', -1]] },
  { title: 'LABEL', font: 'body', lhFactor: 1.25, tracking: 0.01, weight: 500, steps: [['label-lg', 0], ['label-md', -1], ['label-sm', -2], ['label-xs', -3]] }
]

/** [name, size px, line height px, tracking em, weight] */
type AppleStep = readonly [string, number, number, number, number]

const APPLE: Record<'ios' | 'watch', AppleStep[]> = {
  ios: [
    ['caption-2', 11, 13, 0.0064, 400], ['caption-1', 12, 16, 0, 400], ['footnote', 13, 18, -0.0062, 400], ['subhead', 15, 20, -0.0153, 400],
    ['callout', 16, 21, -0.02, 400], ['body', 17, 22, -0.0253, 400], ['headline', 17, 22, -0.0253, 600], ['title-3', 20, 25, 0.019, 400],
    ['title-2', 22, 28, 0.0159, 400], ['title-1', 28, 34, 0.0129, 400], ['large-title', 34, 41, 0.0109, 400]
  ],
  watch: [
    ['footnote-2', 13, 15, 0, 400], ['footnote', 14, 16, 0, 400], ['caption', 15, 18, 0, 400], ['body', 16, 21, 0, 400], ['headline', 16, 21, 0, 600],
    ['title-3', 18, 22, 0, 400], ['title-2', 20, 24, 0, 400], ['title-1', 24, 28, 0, 400], ['large-title', 32, 36, 0, 400]
  ]
}

/** The "Modern" Apple variant: +2px line height, no tracking, semibold headline and titles. */
function modern(list: AppleStep[]): AppleStep[] {
  return list.map(([n, size, lh, , w]) => [n, size, lh + 2, 0, n === 'headline' || n.startsWith('title') ? 600 : w] as const)
}

/** A named step with its own size, as in a design system that fixes its sizes (Untitled UI) instead of deriving them. */
export interface FixedStep {
  name: string
  group: string
  font: 'heading' | 'body'
  size: number
  lh: number
  tr: number
  weight: number
}

export interface TypeSettings {
  platform: PlatformIndex
  base: number
  ratio: number
  grid: number
  preset: PresetKey | null
  headingFont: string
  bodyFont: string
  tablet: { on: boolean; pct: number }
  mobile: { on: boolean; pct: number }
  view: ViewKey
  apple: AppleStyle
  /** Extra weights per step name. */
  variants: Record<string, number[]>
  /** Line-height (px) and tracking (em) overrides per step name. */
  overrides: Record<string, { lh?: number; tr?: number; size?: number }>
  /** Named steps with fixed sizes; when set they replace the scale made from the base size and ratio. */
  fixed?: FixedStep[]
}

export function defaultTypeSettings(): TypeSettings {
  return {
    platform: 1, base: 14, ratio: 1.125, grid: 8, preset: null, headingFont: 'Raleway', bodyFont: 'Nunito',
    tablet: { on: true, pct: -8 }, mobile: { on: true, pct: -15 }, view: 'desktop', apple: 'hig', variants: {}, overrides: {}
  }
}

export interface TypeVariant { name: string; weight: number }

export interface TypeRow {
  name: string
  size: number
  lh: number
  tr: number
  weight: number
  /** Which font stack the row uses. */
  font: 'heading' | 'body'
  overridden: boolean
  variants: TypeVariant[]
}

export interface TypeGroup { title: string; font: string; rows: TypeRow[] }

/** Tablet maps to Grid's MD and Mobile to XS: a view whose Grid breakpoint is off is off here too. */
export function withGridBreakpoints(s: TypeSettings, mdOn: boolean, xsOn: boolean): TypeSettings {
  return { ...s, tablet: { ...s.tablet, on: s.tablet.on && mdOn }, mobile: { ...s.mobile, on: s.mobile.on && xsOn } }
}

/** The view actually shown: a disabled Tablet or Mobile view falls back to Desktop. */
export function activeView(s: TypeSettings): ViewKey {
  if (s.view === 'tablet' && !s.tablet.on) return 'desktop'
  if (s.view === 'mobile' && !s.mobile.on) return 'desktop'
  return s.view
}

function shrinkFactor(s: TypeSettings): number {
  const v = activeView(s)
  if (v === 'tablet') return 1 + s.tablet.pct / 100
  if (v === 'mobile') return 1 + s.mobile.pct / 100
  return 1
}

function makeRow(s: TypeSettings, name: string, size: number, lhBase: number, trBase: number, weight: number, font: 'heading' | 'body'): TypeRow {
  const ov = s.overrides[name] ?? {}
  const lh = ov.lh ?? lhBase
  const tr = ov.tr ?? trBase
  const variants = (s.variants[name] ?? []).map((w) => ({ name: `${name}-${WEIGHTS.find((x) => x[1] === w)?.[0] ?? w}`, weight: w }))
  return { name, size, lh, tr, weight, font, overridden: ov.lh !== undefined || ov.tr !== undefined || ov.size !== undefined, variants }
}

/** Fixed steps in their groups. A size can be edited per step; headings still shrink on the smaller breakpoints. */
function fixedGroups(s: TypeSettings, steps: FixedStep[]): TypeGroup[] {
  const f = shrinkFactor(s)
  const titles = [...new Set(steps.map((x) => x.group))]
  return titles.map((title) => {
    const list = steps.filter((x) => x.group === title)
    return {
      title,
      font: list[0].font === 'heading' ? s.headingFont : s.bodyFont,
      rows: list.map((x) => {
        const base = s.overrides[x.name]?.size ?? x.size
        const k = x.font === 'heading' ? f : 1
        const size = Math.round(base * k)
        return makeRow(s, x.name, size, Math.round(x.lh * (size / x.size)), x.tr, x.weight, x.font)
      })
    }
  })
}

export function computeGroups(s: TypeSettings): TypeGroup[] {
  if (s.fixed) return fixedGroups(s, s.fixed)
  if (isWeb(s.platform)) {
    const f = shrinkFactor(s)
    return WEB.map((g) => ({
      title: g.title,
      font: g.font === 'heading' ? s.headingFont : s.bodyFont,
      rows: g.steps.map(([name, step]) => {
        let size = Math.round(s.base * Math.pow(s.ratio, step))
        if (g.font === 'heading') size = Math.round(size * f)
        let lh = Math.max(s.grid, Math.round((size * g.lhFactor) / s.grid) * s.grid)
        // A line can never be shorter than its own text: snap up to the next grid step instead.
        if (lh < size) lh = Math.ceil(size / s.grid) * s.grid
        return makeRow(s, name, size, lh, g.tracking, g.weight, g.font)
      })
    }))
  }
  const base = APPLE[s.platform === 2 ? 'ios' : 'watch']
  const list = s.apple === 'modern' ? modern(base) : base
  return [{ title: 'TEXT STYLES', font: 'SF Pro Display', rows: list.map(([n, size, lh, tr, w]) => makeRow(s, n, size, lh, tr, w, size >= 20 ? 'heading' : 'body')) }]
}

/** Steps plus weight variants: the number shown in the Scale tab and Export badges. */
export function countRows(groups: TypeGroup[]): number {
  return groups.reduce((n, g) => n + g.rows.reduce((m, r) => m + 1 + r.variants.length, 0), 0)
}

/** The unit in effect: Apple platforms have no rem, so it shows pt. */
export function effectiveUnit(unit: Unit, platform: PlatformIndex): Unit {
  return !isWeb(platform) && unit === 'rem' ? 'pt' : unit
}

export function formatSize(px: number, unit: Unit, web: boolean): string {
  if (unit === 'rem') return `${(px / 16).toFixed(3)}rem`
  if (unit === 'pt') return `${web ? +(px * 0.75).toFixed(1) : px}pt`
  return `${px}px`
}

export function trackingLabel(t: number): string {
  return t === 0 ? '0' : `${t > 0 ? '' : '−'}${Math.abs(t).toFixed(4)}em`
}

export function fontStack(font: string): string {
  return font === 'SF Pro Display' || font === 'SF Pro Text'
    ? "-apple-system, 'SF Pro Display', system-ui, Inter, sans-serif"
    : `'${font} Variable', '${font}', system-ui, sans-serif`
}

/** The css family for a row, honouring the platform's fonts. */
export function rowFamily(s: TypeSettings, row: TypeRow): string {
  if (!isWeb(s.platform)) return fontStack(row.font === 'heading' ? 'SF Pro Display' : 'SF Pro Text')
  return fontStack(row.font === 'heading' ? s.headingFont : s.bodyFont)
}

/** The font family names used by the heading and body roles. Apple platforms use SF Pro. */
export function typeFonts(s: TypeSettings): { heading: string; body: string } {
  return isWeb(s.platform) ? { heading: s.headingFont, body: s.bodyFont } : { heading: 'SF Pro Display', body: 'SF Pro Text' }
}

/** The declarations that change with the breakpoint: size, line height and tracking of every step. */
function typeResponsiveLines(groups: TypeGroup[], web: boolean): string[] {
  return groups.flatMap((g) =>
    g.rows.flatMap((r) => [
      `  --type-${r.name}-size: ${web ? `${(r.size / 16).toFixed(3)}rem` : `${r.size}px`};`,
      `  --type-${r.name}-line: ${r.lh}px;`,
      `  --type-${r.name}-track: ${r.tr}em;`
    ])
  )
}

/** Declarations that stay the same at every breakpoint: fonts, family, weight and variant weights. */
function typeFixedLines(groups: TypeGroup[], fonts?: { heading: string; body: string }): string[] {
  const lines: string[] = []
  if (fonts) lines.push(`  --type-font-heading: ${fontStack(fonts.heading)};`, `  --type-font-body: ${fontStack(fonts.body)};`)
  for (const g of groups) {
    for (const r of g.rows) {
      if (fonts) lines.push(`  --type-${r.name}-family: var(--type-font-${r.font});`, `  --type-${r.name}-weight: ${r.weight};`)
      for (const v of r.variants) lines.push(`  --type-${v.name}-weight: ${v.weight};`)
    }
  }
  return lines
}

/**
 * Type tokens as CSS. With `byBreakpoint`, sizes, line heights and tracking follow the breakpoint (mobile first, with
 * media queries at the MD and XXL widths); without it, the given groups are written once.
 */
export function toTypeCss(groups: TypeGroup[], web: boolean, fonts?: { heading: string; body: string }, byBreakpoint?: Record<'xxl' | 'md' | 'xs', TypeGroup[]>): string {
  const fixed = typeFixedLines(groups, fonts)
  const per = byBreakpoint
    ? { xxl: typeResponsiveLines(byBreakpoint.xxl, web), md: typeResponsiveLines(byBreakpoint.md, web), xs: typeResponsiveLines(byBreakpoint.xs, web) }
    : (() => { const l = typeResponsiveLines(groups, web); return { xxl: l, md: l, xs: l } })()
  return responsiveBlocks(fixed, per)
}

const SPECIMEN = {
  web: { label: 'label-sm', h1: 'heading-xl', lead: 'body-lg', h2: 'heading-md', body: 'body-md', small: 'body-sm' },
  ios: { label: 'footnote', h1: 'large-title', lead: 'callout', h2: 'title-3', body: 'body', small: 'caption-1' },
  watch: { label: 'footnote', h1: 'large-title', lead: 'callout', h2: 'title-3', body: 'body', small: 'caption' }
}

const FIXED_SPECIMEN = { label: 'text-sm', h1: 'display-lg', lead: 'text-xl', h2: 'display-xs', body: 'text-md', small: 'text-sm' }

/** Rows used by the Preview tab, keyed by role. */
export function specimenRows(s: TypeSettings, groups: TypeGroup[]): Record<keyof typeof SPECIMEN.web, TypeRow> {
  const map = s.fixed ? FIXED_SPECIMEN : SPECIMEN[isWeb(s.platform) ? 'web' : s.platform === 2 ? 'ios' : 'watch']
  const all = groups.flatMap((g) => g.rows)
  const find = (n: string) => all.find((r) => r.name === n) ?? all[0]
  return { label: find(map.label), h1: find(map.h1), lead: find(map.lead), h2: find(map.h2), body: find(map.body), small: find(map.small) }
}
