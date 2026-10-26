import { describe, expect, it } from 'vitest'
import { MAX_THEMES, cloneData, completeData, defaultThemeData, nextThemeId, slugify, themeSlugs, uniqueName, untitledThemeData, type Theme } from './themes'

describe('uniqueName', () => {
  it('keeps a free name and numbers a taken one, ignoring case and spacing', () => {
    expect(uniqueName('Ocean', ['Default'])).toBe('Ocean')
    expect(uniqueName('Ocean', ['Ocean'])).toBe('Ocean 2')
    expect(uniqueName('  ocean  ', ['Ocean', 'Ocean 2'])).toBe('ocean 3')
    expect(uniqueName('', [])).toBe('Theme')
    expect(uniqueName('A   B', [])).toBe('A B')
  })
})

describe('slugify', () => {
  it('makes CSS-safe names', () => {
    expect(slugify('Ocean Blue')).toBe('ocean-blue')
    expect(slugify('  Café  Noir!! ')).toBe('cafe-noir')
    expect(slugify('日本語')).toBe('theme')
    expect(slugify('---')).toBe('theme')
    expect(slugify('Brand_2024')).toBe('brand-2024')
  })
  it('gives every theme its own slug, in order', () => {
    expect(themeSlugs([{ name: 'Ocean' }, { name: 'ocean' }, { name: 'OCEAN!' }, { name: 'Sun' }])).toEqual(['ocean', 'ocean-2', 'ocean-3', 'sun'])
  })
})

describe('theme data', () => {
  it('has everything a theme owns, and nothing shared', () => {
    expect(Object.keys(defaultThemeData()).sort()).toEqual(['elevation', 'grid', 'settings', 'spacing', 'tokenAlpha', 'tokenOverrides', 'type'])
  })
  it('clones deeply so themes never share objects', () => {
    const a = defaultThemeData()
    const b = cloneData(a)
    b.settings.text.primary = '#000000'
    b.grid.columns.xxl = 3
    b.elevation.tokens[0].layers[0].blur = 99
    expect(a.settings.text.primary).toBe('#9d00d6')
    expect(a.grid.columns.xxl).toBe(12)
    expect(a.elevation.tokens[0].layers[0].blur).toBe(3)
  })
  it('completes an older or partial save with defaults', () => {
    const d = completeData({ settings: { text: { primary: '#123456' } } as never })
    expect(d.settings.text.primary).toBe('#123456')
    expect(d.settings.utility).toEqual([])
    expect(d.grid.columns.xxl).toBe(12)
    expect(completeData(undefined)).toEqual(defaultThemeData())
  })
  it('picks the lowest unused id and caps the number of themes at eight', () => {
    const t = (id: string): Theme => ({ id, name: id, data: defaultThemeData() })
    expect(nextThemeId([t('theme-1')])).toBe('theme-2')
    expect(nextThemeId([t('theme-1'), t('theme-2'), t('theme-3')])).toBe('theme-4')
    expect(nextThemeId([t('theme-2')])).toBe('theme-3')
    expect(MAX_THEMES).toBe(8)
  })
})

describe('untitledThemeData', () => {
  it('is built on the Untitled colour schema, with the other collections kept as imported', () => {
    const d = untitledThemeData()
    expect(d.schemaId).toBe('untitled-ui')
    expect(d.type.fixed!.map((x) => x.name)).toEqual(['text-xs', 'text-sm', 'text-md', 'text-lg', 'text-xl', 'display-xs', 'display-sm', 'display-md', 'display-lg', 'display-xl', 'display-2xl'])
    expect([d.type.headingFont, d.type.bodyFont]).toEqual(['Inter', 'Inter'])
    expect(d.imported!.collections.map((c) => c.name)).toEqual(['_Primitives', '2. Radius', '3. Spacing', '4. Widths', '5. Containers', 'Breakpoints'])
    // an independent copy
    d.imported!.collections[0].variables.length = 0
    expect(untitledThemeData().imported!.collections[0].variables).toHaveLength(32)
  })
})
