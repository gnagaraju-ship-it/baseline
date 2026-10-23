import { describe, expect, it } from 'vitest'
import { defaultSettings } from './colour'
import { defaultElevationSettings } from './elevation'
import type { ExportInput } from './exportAll'
import { ALL_MODULES, buildExport, normaliseSelection } from './exportBuilder'
import { defaultGridSettings } from './grid'
import { defaultSpacingSettings } from './spacing'
import { defaultTypeSettings } from './typeScale'

const input = (): ExportInput => ({
  settings: defaultSettings(), tokenOverrides: {}, type: defaultTypeSettings(), grid: defaultGridSettings(),
  spacing: defaultSpacingSettings(), elevation: defaultElevationSettings()
})

describe('normaliseSelection', () => {
  it('adds the ramps when semantic tokens are chosen, and keeps a fixed order', () => {
    expect(normaliseSelection(['semantic'])).toEqual(['ramps', 'semantic'])
    expect(normaliseSelection(['elevation', 'type'])).toEqual(['type', 'elevation'])
    expect(normaliseSelection([])).toEqual([])
  })
})

describe('buildExport', () => {
  it('css: only the chosen modules, with counts', () => {
    const e = buildExport(input(), 'css', ['type', 'grids'])
    expect(e.filename).toBe('omni-tokens.css')
    expect(e.mime).toBe('text/css')
    expect(e.count).toBe(11 + 3)
    expect(e.text).toContain('--type-body-md-size')
    expect(e.text).toContain('--grid-xxl-width')
    expect(e.text).not.toContain('--primary-10')
    expect(e.text).not.toContain('--elevation-')
    expect(e.lines).toBeGreaterThan(10)
  })
  it('css: every module equals the all-modules export', () => {
    const e = buildExport(input(), 'css', ALL_MODULES)
    expect(e.count).toBe(112 + 58 + 11 + 3 + 17 + 5)
    expect(e.text).toContain('--primary-10: #9D00D6;')
    expect(e.text).toContain('--bg-fill: var(--primary-10);')
  })
  it('css: semantic brings the ramps so every variable resolves', () => {
    const e = buildExport(input(), 'css', ['semantic'])
    expect(e.text).toContain('--primary-10: #9D00D6;')
    expect(e.count).toBe(112 + 58)
  })
  it('json: only the chosen groups plus the file description', () => {
    const e = buildExport(input(), 'json', ['spacing', 'elevation'])
    const doc = JSON.parse(e.text)
    expect(e.filename).toBe('omni-tokens.json')
    expect(e.mime).toBe('application/json')
    expect(Object.keys(doc).filter((k) => !k.startsWith('$'))).toEqual(['Spacing', 'Elevation'])
    expect(doc.$description).toContain('com.figma')
    expect(e.count).toBe(17 + 5)
  })
  it('json: semantic tokens come with the primitives they alias', () => {
    const doc = JSON.parse(buildExport(input(), 'json', ['semantic']).text)
    expect(Object.keys(doc).filter((k) => !k.startsWith('$'))).toEqual(['Primitives', 'Semantic'])
  })
  it('is empty when nothing is chosen', () => {
    for (const f of ['css', 'json'] as const) {
      const e = buildExport(input(), f, [])
      expect(e).toMatchObject({ text: '', count: 0, lines: 0 })
    }
  })
})
