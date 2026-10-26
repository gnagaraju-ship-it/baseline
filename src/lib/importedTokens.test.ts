import { describe, expect, it } from 'vitest'
import { exportSections } from './exportAll'
import { buildExport } from './exportBuilder'
import { ALL_MODULES } from './exportBuilder'
import { byModule, cssName, importedCount, importedDoc, moduleOf } from './importedTokens'
import { defaultThemeData, untitledThemeData } from './themes'

const untitled = untitledThemeData()
const set = untitled.imported!

describe('imported tokens', () => {
  it('has every variable of the 8 files, and no helper strings', () => {
    expect(importedCount(set)).toBe(702)
    const all = set.collections.flatMap((c) => c.variables.map((v) => v.name))
    expect(new Set(all).size).toBe(702)
    expect(all.some((n) => / (hex|contrast)$/.test(n))).toBe(false)
  })

  it('sorts variables into modules, with nothing left over', () => {
    const g = byModule(set)
    const n = (m: keyof typeof g) => g[m].reduce((s, c) => s + c.variables.length, 0)
    expect(n('ramps')).toBe(311 + 11)
    expect(n('semantic')).toBe(273)
    expect(n('type')).toBe(32)
    expect(n('grids')).toBe(15)
    expect(n('spacing')).toBe(32 + 11 + 17)
    expect(n('elevation')).toBe(0)
    expect(moduleOf('_Primitives', 'Spacing/1 (4px)')).toBe('spacing')
  })

  it('keeps aliases and resolved values, and Light and Dark modes', () => {
    const modes = set.collections.find((c) => c.name === '1. Color modes')!
    expect(modes.modes).toEqual(['Light mode', 'Dark mode'])
    const v = modes.variables.find((x) => x.name === 'Colors/Background/bg-primary')!
    expect(v.values['Light mode']).toEqual({ v: '#FFFFFF', a: '_Primitives::Colors/Base/white' })
    expect(v.values['Dark mode'].v).not.toBe('#FFFFFF')
    const brand = set.collections.find((c) => c.name === 'Brand palette')!
    expect(brand.modes).toHaveLength(10)
    expect(brand.variables.find((x) => x.name === 'Brand/600')!.values.Original.v).toBe('#7F56D9')
  })

  it('exports only the file tokens as CSS, with modes as selectors', () => {
    const css = exportSections(untitled).map((s) => s.css).join('\n')
    expect(css).toContain('--colors-brand-600:')
    expect(css).toContain('[data-theme="dark"] {')
    expect(css).toContain('[data-brand-palette="original"] {')
    expect(css).toContain('--colors-background-bg-primary: var(--colors-base-white);')
    expect(css).toContain('--font-size-text-md: 16px;')
    expect(css).toContain('--font-family-font-family-body: "Inter";')
    expect(css).not.toContain('--primary-10')
    expect(exportSections(untitled).find((s) => s.id === 'elevation')).toMatchObject({ css: '', count: 0 })
    expect(cssName('Spacing/0․5 (2px)')).toBe('--spacing-0-5-2px')
  })

  it('goes into a multi-theme file next to Default, scoped, without empty sections', () => {
    const out = buildExport([{ name: 'Default', data: defaultThemeData() }, { name: 'Untitled', data: untitled }], 'css', ALL_MODULES)
    expect(out.text).toContain('/* Theme: Untitled */')
    expect(out.text).toContain('[data-brand="untitled"] {')
    expect(out.text).toContain('[data-brand="untitled"][data-theme="dark"] {')
    expect(out.text).toContain('[data-brand="untitled"][data-brand-palette="original"] {')
    expect(out.text.split('\n').filter((l) => /^\s*:root/.test(l)).every((l) => l.includes('[data-brand="default"]'))).toBe(true)
    expect(out.count).toBe(702 + buildExport(defaultThemeData(), 'css', ALL_MODULES).count)
  })

  it('writes the JSON by collection, with modes, aliases and only the chosen modules', () => {
    const doc = importedDoc(set, ['semantic', 'ramps'])
    const imp = doc.Imported as any
    expect(Object.keys(imp).sort()).toEqual(['1. Color modes', 'Brand palette', '_Primitives'])
    const token = imp['1. Color modes'].Colors.Background['bg-primary']
    expect(token.$type).toBe('color')
    expect(token.$extensions['com.baseline'].alias['Light mode']).toBe('_Primitives::Colors/Base/white')
    expect(imp['_Primitives'].Spacing).toBeUndefined() // spacing is another module
    const out = JSON.parse(buildExport([{ name: 'Default', data: defaultThemeData() }, { name: 'Untitled', data: untitled }], 'json', ['type']).text)
    expect(Object.keys(out.Themes.Untitled.Imported)).toEqual(['6. Typography'])
    expect(out.Themes.Default.Type).toBeDefined()
  })
})
