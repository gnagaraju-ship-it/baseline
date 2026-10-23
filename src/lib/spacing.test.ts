import { describe, expect, it } from 'vitest'
import { defaultGridSettings } from './grid'
import {
  SPACING_BASES, barWidth, defaultSpacingSettings, formatSpacing, initOn, onValues, parseCustom, scaleSteps, spacingBreakpoints, spacingTokens, toSpacingCss
} from './spacing'

describe('bases', () => {
  it('has the right number of steps and default-off values', () => {
    expect(SPACING_BASES.b2.steps).toHaveLength(18)
    expect(SPACING_BASES.b4.steps).toHaveLength(23)
    expect(SPACING_BASES.b8.steps).toHaveLength(15)
    expect(SPACING_BASES.custom.steps).toHaveLength(10)
    const on = initOn('b4')
    expect(Object.values(on).filter(Boolean)).toHaveLength(23 - 6)
    expect([6, 10, 28, 72, 88, 104].every((v) => on[v] === false)).toBe(true)
    expect(initOn('b8')[56]).toBe(false)
    expect(Object.values(initOn('custom')).every(Boolean)).toBe(true)
  })
  it('merges custom values uniquely and sorted', () => {
    expect(scaleSteps('custom', [20, 4, 100, 20])).toEqual([0, 4, 8, 12, 16, 20, 24, 32, 48, 64, 96, 100])
  })
  it('lists the enabled values', () => {
    const s = defaultSpacingSettings()
    const steps = scaleSteps(s.base, s.extra)
    expect(onValues(steps, s.on)).toHaveLength(17)
    expect(onValues(steps, { ...s.on, 24: false })).not.toContain(24)
  })
})

describe('parseCustom', () => {
  it('accepts whole numbers 0..400 only', () => {
    expect(parseCustom('0')).toBe(0)
    expect(parseCustom(' 18 ')).toBe(18)
    expect(parseCustom('400')).toBe(400)
    for (const bad of ['', '-4', '1.5', 'abc', '401']) expect(parseCustom(bad)).toBeNull()
  })
})

describe('breakpoints', () => {
  it('follows Grid when Same as Grid is on, else the independent switches', () => {
    const grid = { ...defaultGridSettings(), on: { xxl: true, md: false, xs: true } }
    const s = defaultSpacingSettings()
    expect(spacingBreakpoints(s, grid)).toEqual(['xxl', 'xs'])
    expect(spacingBreakpoints({ ...s, same: false, bp: { xxl: false, md: true, xs: true } }, grid)).toEqual(['md', 'xs'])
  })
})

describe('tokens', () => {
  const grid = defaultGridSettings()
  const enabled = onValues(scaleSteps('b4', []), initOn('b4'))
  const all = spacingTokens(grid, ['xxl', 'md', 'xs'], enabled)
  const row = (n: string) => all.flatMap((g) => g.rows).find((r) => r.name === n)!

  it('has GRID, SECTION, STACK and INSET groups with 2, 2, 5 and 3 rows', () => {
    expect(all.map((g) => [g.name, g.rows.length])).toEqual([['GRID', 2], ['SECTION', 2], ['STACK', 5], ['INSET', 3]])
  })
  it('reads grid margin and gutter from Grid (defaults equal the mockup constants)', () => {
    expect(row('grid-margin').cells.map((c) => c.value)).toEqual([16, 16, 16])
    expect(row('grid-gutter').cells.map((c) => c.value)).toEqual([24, 16, 16])
    const airy = spacingTokens({ ...grid, preset: 'airy' }, ['xxl'], enabled)
    expect(airy[0].rows[0].cells[0].value).toBe(32)
  })
  it('uses the fixed values per breakpoint', () => {
    expect(row('section-y').cells.map((c) => c.value)).toEqual([96, 64, 48])
    expect(row('stack-md').cells.map((c) => c.value)).toEqual([16, 16, 12])
  })
  it('flags nothing off-scale by default and flags values whose step is switched off', () => {
    expect(all.flatMap((g) => g.rows).flatMap((r) => r.cells).some((c) => c.offScale)).toBe(false)
    const less = spacingTokens(grid, ['xxl', 'md', 'xs'], enabled.filter((v) => v !== 24))
    const flagged = less.flatMap((g) => g.rows.flatMap((r) => r.cells.filter((c) => c.offScale).map((c) => `${r.name}-${c.bp}`)))
    expect(flagged).toEqual(['grid-gutter-xxl', 'stack-lg-xxl', 'stack-xl-xs', 'inset-lg-xxl'])
  })
  it('only has cells for the requested breakpoints', () => {
    const two = spacingTokens(grid, ['md', 'xs'], enabled)
    expect(two[0].rows[0].cells.map((c) => c.bp)).toEqual(['md', 'xs'])
    expect(row('stack-lg').cells).toHaveLength(3)
    expect(two[2].rows[3].cells.map((c) => c.value)).toEqual([20, 16])
  })
})

describe('formatting and css', () => {
  it('formats units and bar widths', () => {
    expect(formatSpacing(24, 'rem')).toBe('1.5rem')
    expect(formatSpacing(6, 'rem')).toBe('0.375rem')
    expect(formatSpacing(6, 'pt')).toBe('4.5pt')
    expect(formatSpacing(6, 'px')).toBe('6px')
    expect(barWidth(0)).toBe(2)
    expect(barWidth(48)).toBe(24)
    expect(barWidth(160)).toBe(60)
  })
  it('exports enabled steps then tokens per enabled breakpoint, in px', () => {
    const grid = defaultGridSettings()
    const css = toSpacingCss([0, 4], spacingTokens(grid, ['xxl', 'xs'], [0, 4]))
    expect(css.startsWith(':root {\n  --space-0: 0px;\n  --space-4: 4px;')).toBe(true)
    expect(css).toContain('--stack-md-xxl: 16px;')
    expect(css).toContain('--stack-md-xs: 12px;')
    expect(css).toContain('--grid-gutter-xxl: 24px;')
    expect(css).not.toContain('--stack-md-md:')
  })
})
