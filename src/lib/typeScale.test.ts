import { describe, expect, it } from 'vitest'
import {
  activeView, computeGroups, countRows, defaultTypeSettings, effectiveUnit, fontStack, formatSize, specimenRows, toTypeCss, trackingLabel, typeFonts, type TypeSettings
} from './typeScale'

const row = (s: TypeSettings, name: string) => computeGroups(s).flatMap((g) => g.rows).find((r) => r.name === name)!

describe('web scale', () => {
  const s = defaultTypeSettings()
  it('has 11 steps in HEADING, BODY and LABEL groups', () => {
    const g = computeGroups(s)
    expect(g.map((x) => [x.title, x.rows.length])).toEqual([['HEADING', 4], ['BODY', 3], ['LABEL', 4]])
    expect(g[0].font).toBe('Raleway')
    expect(g[1].font).toBe('Nunito')
    expect(countRows(g)).toBe(11)
  })
  it('sizes steps as round(base × ratio^step)', () => {
    expect(row(s, 'heading-xl').size).toBe(25)
    expect(row(s, 'heading-sm').size).toBe(18)
    expect(row(s, 'body-md').size).toBe(14)
    expect(row(s, 'label-xs').size).toBe(10)
  })
  it('snaps line heights to the grid and never drops below it', () => {
    expect(row(s, 'heading-xl').lh).toBe(32)
    expect(row(s, 'body-md').lh).toBe(24)
    expect(row(s, 'label-xs').lh).toBe(16)
    expect(row({ ...s, grid: 4 }, 'body-md').lh).toBe(20)
    expect(row({ ...s, base: 10, grid: 8 }, 'label-xs').lh).toBe(8)
  })
  it('uses the group tracking and weight', () => {
    expect(row(s, 'heading-md')).toMatchObject({ tr: -0.01, weight: 500, font: 'heading' })
    expect(row(s, 'body-sm')).toMatchObject({ tr: 0, weight: 400, font: 'body' })
    expect(row(s, 'label-md')).toMatchObject({ tr: 0.01, weight: 500 })
  })
  it('shrinks only headings on Tablet and Mobile', () => {
    const tablet = { ...s, view: 'tablet' as const }
    expect(row(tablet, 'heading-xl').size).toBe(Math.round(25 * 0.92))
    expect(row(tablet, 'body-lg').size).toBe(row(s, 'body-lg').size)
    expect(row({ ...s, view: 'mobile' }, 'heading-xl').size).toBe(Math.round(25 * 0.85))
  })
  it('falls back to Desktop when the chosen view is switched off', () => {
    const off = { ...s, view: 'mobile' as const, mobile: { on: false, pct: -15 } }
    expect(activeView(off)).toBe('desktop')
    expect(row(off, 'heading-xl').size).toBe(25)
  })
  it('applies overrides and flags them', () => {
    const o = { ...s, overrides: { 'body-md': { lh: 30, tr: 0.02 } } }
    expect(row(o, 'body-md')).toMatchObject({ lh: 30, tr: 0.02, overridden: true })
    expect(row(o, 'body-lg').overridden).toBe(false)
  })
})

describe('line height is never shorter than the text', () => {
  it('snaps up to the next grid step when the nearest one would be shorter than the font size', () => {
    const s = { ...defaultTypeSettings(), base: 14, ratio: 1.25 }
    const all = computeGroups(s).flatMap((g) => g.rows)
    for (const r of all) expect(r.lh).toBeGreaterThanOrEqual(r.size)
    expect(all.find((r) => r.name === 'label-sm')).toMatchObject({ size: 9, lh: 16 })
    expect(all.find((r) => r.name === 'label-xs')).toMatchObject({ size: 7, lh: 8 })
  })
  it('holds for every base, ratio and grid', () => {
    for (const base of [10, 12, 14, 16, 18, 24]) for (const ratio of [1.067, 1.125, 1.2, 1.25, 1.333, 1.5, 1.618]) for (const grid of [4, 8]) {
      for (const r of computeGroups({ ...defaultTypeSettings(), base, ratio, grid }).flatMap((g) => g.rows)) expect(r.lh).toBeGreaterThanOrEqual(r.size)
    }
  })
})

describe('apple scale', () => {
  it('lists 11 iOS and 9 watchOS HIG styles in the SF stack', () => {
    const ios = computeGroups({ ...defaultTypeSettings(), platform: 2 })
    expect(ios).toHaveLength(1)
    expect(ios[0].rows).toHaveLength(11)
    expect(ios[0].rows.find((r) => r.name === 'body')).toMatchObject({ size: 17, lh: 22, tr: -0.0253, weight: 400 })
    expect(computeGroups({ ...defaultTypeSettings(), platform: 3 })[0].rows).toHaveLength(9)
  })
  it('Modern adds 2px of line height, drops tracking and semibolds headline and titles', () => {
    const r = (name: string) => computeGroups({ ...defaultTypeSettings(), platform: 2, apple: 'modern' })[0].rows.find((x) => x.name === name)!
    expect(r('body')).toMatchObject({ lh: 24, tr: 0, weight: 400 })
    expect(r('headline').weight).toBe(600)
    expect(r('title-1')).toMatchObject({ lh: 36, weight: 600 })
  })
  it('uses the heading font from 20px up', () => {
    const rows = computeGroups({ ...defaultTypeSettings(), platform: 2 })[0].rows
    expect(rows.find((r) => r.name === 'title-3')!.font).toBe('heading')
    expect(rows.find((r) => r.name === 'subhead')!.font).toBe('body')
  })
})

describe('variants and counts', () => {
  it('names variants after the weight and adds them to the row count', () => {
    const s = { ...defaultTypeSettings(), variants: { 'body-md': [500, 700] } }
    expect(row(s, 'body-md').variants).toEqual([{ name: 'body-md-medium', weight: 500 }, { name: 'body-md-bold', weight: 700 }])
    expect(countRows(computeGroups(s))).toBe(13)
  })
})

describe('formatting', () => {
  it('converts sizes per unit', () => {
    expect(formatSize(14, 'rem', true)).toBe('0.875rem')
    expect(formatSize(14, 'px', true)).toBe('14px')
    expect(formatSize(14, 'pt', true)).toBe('10.5pt')
    expect(formatSize(17, 'pt', false)).toBe('17pt')
  })
  it('shows pt on Apple platforms when rem is selected', () => {
    expect(effectiveUnit('rem', 2)).toBe('pt')
    expect(effectiveUnit('px', 2)).toBe('px')
    expect(effectiveUnit('rem', 1)).toBe('rem')
  })
  it('labels tracking', () => {
    expect(trackingLabel(0)).toBe('0')
    expect(trackingLabel(-0.01)).toBe('−0.0100em')
    expect(trackingLabel(0.0064)).toBe('0.0064em')
  })
  it('builds a font stack, with SF Pro using the system font', () => {
    expect(fontStack('DM Sans')).toBe("'DM Sans Variable', 'DM Sans', system-ui, sans-serif")
    expect(fontStack('SF Pro Text')).toContain('-apple-system')
  })
})

describe('css export: fonts and weights', () => {
  it('names the heading and body fonts once and points every step at its role, with its weight', () => {
    const s = defaultTypeSettings()
    const css = toTypeCss(computeGroups(s), true, typeFonts(s))
    expect(css).toContain("--type-font-heading: 'Raleway Variable', 'Raleway', system-ui, sans-serif;")
    expect(css).toContain("--type-font-body: 'Nunito Variable', 'Nunito', system-ui, sans-serif;")
    expect(css).toContain('--type-heading-xl-family: var(--type-font-heading);')
    expect(css).toContain('--type-heading-xl-weight: 500;')
    expect(css).toContain('--type-body-md-family: var(--type-font-body);')
    expect(css).toContain('--type-body-md-weight: 400;')
    expect(css).toContain('--type-label-xs-weight: 500;')
  })
  it('uses SF Pro on Apple platforms and still works without fonts', () => {
    const s = { ...defaultTypeSettings(), platform: 2 as const }
    expect(typeFonts(s)).toEqual({ heading: 'SF Pro Display', body: 'SF Pro Text' })
    expect(toTypeCss(computeGroups(s), false, typeFonts(s))).toContain('--type-font-heading: -apple-system')
    expect(toTypeCss(computeGroups(defaultTypeSettings()), true)).not.toContain('--type-font-heading')
  })
})

describe('css export', () => {
  it('writes size in rem for web, line and track per step, and variant weights', () => {
    const s = { ...defaultTypeSettings(), variants: { 'body-md': [600] } }
    const css = toTypeCss(computeGroups(s), true)
    expect(css.startsWith(':root {')).toBe(true)
    expect(css).toContain('--type-heading-xl-size: 1.563rem;')
    expect(css).toContain('--type-heading-xl-line: 32px;')
    expect(css).toContain('--type-heading-xl-track: -0.01em;')
    expect(css).toContain('--type-body-md-semibold-weight: 600;')
  })
  it('writes size in px for Apple platforms', () => {
    const css = toTypeCss(computeGroups({ ...defaultTypeSettings(), platform: 2 }), false)
    expect(css).toContain('--type-body-size: 17px;')
    expect(css).toContain('--type-body-line: 22px;')
  })
})

describe('specimen', () => {
  it('picks the roles from the scale', () => {
    const s = defaultTypeSettings()
    const sp = specimenRows(s, computeGroups(s))
    expect([sp.label.name, sp.h1.name, sp.lead.name, sp.h2.name, sp.body.name, sp.small.name]).toEqual(['label-sm', 'heading-xl', 'body-lg', 'heading-md', 'body-md', 'body-sm'])
    const a = { ...s, platform: 3 as const }
    expect(specimenRows(a, computeGroups(a)).small.name).toBe('caption')
  })
})
