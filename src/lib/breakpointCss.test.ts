import { describe, expect, it } from 'vitest'
import { defaultGridSettings, toGridCss } from './grid'
import { responsiveBlocks } from './breakpointCss'
import { typeByBreakpoint } from './responsive'
import { defaultSpacingSettings, onValues, scaleSteps, spacingBreakpoints, spacingTokens, toSpacingCss } from './spacing'
import { computeGroups, defaultTypeSettings, toTypeCss, typeFonts } from './typeScale'

describe('responsiveBlocks', () => {
  const l = (a: string, b: string, c: string) => ({ xs: [`  --x: ${a};`], md: [`  --x: ${b};`], xxl: [`  --x: ${c};`] })
  it('writes one block when nothing changes by breakpoint', () => {
    expect(responsiveBlocks(['  --f: 1;'], l('1', '1', '1'))).toBe(':root {\n  --f: 1;\n  --x: 1;\n}')
  })
  it('is mobile first: XS in the base block, MD and XXL only where the value changes', () => {
    const css = responsiveBlocks([], l('12', '16', '24'))
    expect(css).toBe(':root {\n  --x: 12;\n}\n\n@media (min-width: 768px) {\n  :root {\n    --x: 16;\n  }\n}\n\n@media (min-width: 1400px) {\n  :root {\n    --x: 24;\n  }\n}')
    expect(responsiveBlocks([], l('12', '12', '24'))).not.toContain('768px')
    expect(responsiveBlocks([], l('12', '16', '16'))).not.toContain('1400px')
  })
})

describe('type css by breakpoint', () => {
  const s = defaultTypeSettings()
  const grid = defaultGridSettings()
  const css = toTypeCss(computeGroups(s), true, typeFonts(s), typeByBreakpoint(s, grid))
  const rem = (px: number) => `${(px / 16).toFixed(3)}rem`

  it('puts the mobile size in :root and the larger sizes in media queries at the grid widths', () => {
    const root = css.slice(0, css.indexOf('@media'))
    expect(root).toContain(`--type-heading-xl-size: ${rem(21)};`)
    expect(css).toMatch(/@media \(min-width: 768px\) \{\s+:root \{[^}]*--type-heading-xl-size: 1\.438rem;/)
    expect(css).toMatch(/@media \(min-width: 1400px\) \{\s+:root \{[^}]*--type-heading-xl-size: 1\.563rem;/)
  })
  it('keeps fonts and weights in :root once, and body text out of the media queries', () => {
    const root = css.slice(0, css.indexOf('@media'))
    expect(root).toContain('--type-font-heading:')
    expect(root).toContain('--type-heading-xl-weight: 500;')
    const media = css.slice(css.indexOf('@media'))
    expect(media).not.toContain('--type-body-md-size')
    expect(media).not.toContain('--type-font-heading')
    expect(media).toContain('--type-heading-md-size')
  })
  it('collapses to one block when Tablet and Mobile scaling are off', () => {
    const off = { ...s, tablet: { on: false, pct: -8 }, mobile: { on: false, pct: -15 } }
    const flat = toTypeCss(computeGroups(off), true, typeFonts(off), typeByBreakpoint(off, grid))
    expect(flat).not.toContain('@media')
    expect(flat).toContain('--type-heading-xl-size: 1.563rem;')
  })
  it('follows the Grid breakpoints: MD off in Grids means no MD shrink', () => {
    const noMd = { ...grid, on: { xxl: true, md: false, xs: true } }
    const c = toTypeCss(computeGroups(s), true, typeFonts(s), typeByBreakpoint(s, noMd))
    // MD keeps the desktop size, so the jump to 25px happens at 768px and nothing changes again at 1400px
    expect(c).toMatch(/@media \(min-width: 768px\) \{\s+:root \{[^}]*--type-heading-xl-size: 1\.563rem;/)
    expect(c).not.toContain('(min-width: 1400px)')
  })
  it('without breakpoint data it writes the given groups once, as before', () => {
    const plain = toTypeCss(computeGroups(s), true, typeFonts(s))
    expect(plain).not.toContain('@media')
    expect(plain).toContain('--type-heading-xl-size: 1.563rem;')
  })
})

describe('grid and spacing css by breakpoint', () => {
  it('keeps the per-breakpoint names and adds plain variables that follow the breakpoint', () => {
    const css = toGridCss(defaultGridSettings())
    expect(css).toContain('--grid-xxl-columns: 12;')
    const afterFirst = css.slice(css.indexOf('}') + 1)
    expect(afterFirst).toContain('--grid-columns: 4;')
    expect(afterFirst).toMatch(/@media \(min-width: 768px\) \{\s+:root \{\s+--grid-columns: 8;/)
    expect(afterFirst).toMatch(/@media \(min-width: 1400px\) \{\s+:root \{[^}]*--grid-columns: 12;[^}]*--grid-sidebar: 272px;/)
  })
  it('spacing tokens follow the breakpoint too, and a missing breakpoint uses the nearest larger value', () => {
    const grid = defaultGridSettings()
    const enabled = onValues(scaleSteps('b4', []), defaultSpacingSettings().on)
    const css = toSpacingCss(enabled, spacingTokens(grid, spacingBreakpoints(defaultSpacingSettings(), grid), enabled))
    expect(css).toContain('--stack-md-xxl: 16px;')
    const responsive = css.slice(css.indexOf('}') + 1)
    expect(responsive).toContain('--stack-md: 12px;')
    expect(responsive).toMatch(/@media \(min-width: 1400px\) \{[^@]*--section-y: 96px;/)
    const sparse = { ...defaultSpacingSettings(), same: false, bp: { xxl: true, md: false, xs: false } }
    const c2 = toSpacingCss(enabled, spacingTokens(grid, spacingBreakpoints(sparse, grid), enabled))
    expect(c2.slice(c2.indexOf('}') + 1)).not.toContain('@media')
    expect(c2.slice(c2.indexOf('}') + 1)).toContain('--stack-md: 16px;')
  })
})
