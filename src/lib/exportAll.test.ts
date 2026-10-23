import { describe, expect, it } from 'vitest'
import { defaultSettings } from './colour'
import { defaultElevationSettings } from './elevation'
import { exportAll, exportSections, type ExportInput } from './exportAll'
import { defaultGridSettings } from './grid'
import { defaultSpacingSettings } from './spacing'
import { defaultTypeSettings } from './typeScale'

const input = (): ExportInput => ({
  settings: defaultSettings(), tokenOverrides: {}, type: defaultTypeSettings(), grid: defaultGridSettings(),
  spacing: defaultSpacingSettings(), elevation: defaultElevationSettings()
})

describe('exportAll', () => {
  it('has one section per module with the documented counts', () => {
    const s = exportSections(input())
    expect(s.map((x) => x.count)).toEqual([112, 58, 11, 3, 17, 5])
  })
  it('joins every module in one file with headings', () => {
    const { css, count } = exportAll(input())
    expect(count).toBe(112 + 58 + 11 + 3 + 17 + 5)
    for (const marker of ['/* Colour: palette ramps */', '--primary-10: #9D00D6;', '--bg-fill: var(--primary-10);', '[data-theme="dark"]', '--type-body-md-size', '--grid-xxl-columns: 12;', '--space-24: 24px;', '--elevation-md:']) {
      expect(css).toContain(marker)
    }
    expect(css.endsWith('}\n')).toBe(true)
  })
  it('reflects changes in every module', () => {
    const i = input()
    i.grid.on = { xxl: true, md: false, xs: true }
    i.spacing.on[24] = false
    i.elevation.tokens = i.elevation.tokens.slice(0, 2)
    i.tokenOverrides = { 'bg-fill|light': 'info-10' }
    const { css } = exportAll(i)
    expect(css).not.toContain('--grid-md-')
    expect(css).not.toContain('--space-24:')
    expect(css.match(/--elevation-/g)).toHaveLength(2)
    expect(css).toContain('--bg-fill: var(--info-10);')
  })
})
