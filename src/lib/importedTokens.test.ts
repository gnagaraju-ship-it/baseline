import { describe, expect, it } from 'vitest'
import full from '../data/untitled-ui.json'
import { exportSections } from './exportAll'
import { ALL_MODULES, buildExport } from './exportBuilder'
import { byModule, cssName, importedCount, importedDoc, moduleOf, schemaCollections, withSchemaColours, type ImportedSet } from './importedTokens'
import { defaultThemeData, untitledThemeData } from './themes'

const source = full as ImportedSet
const untitled = untitledThemeData()
const set = untitled.imported!

describe('the source files', () => {
  it('has every variable of the 8 files, and no helper strings', () => {
    expect(importedCount(source)).toBe(702)
    const all = source.collections.flatMap((c) => c.variables.map((v) => v.name))
    expect(new Set(all).size).toBe(702)
    expect(all.some((n) => / (hex|contrast)$/.test(n))).toBe(false)
  })

  it('sorts variables into modules, with nothing left over', () => {
    const g = byModule(source)
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
    const modes = source.collections.find((c) => c.name === '1. Color modes')!
    expect(modes.modes).toEqual(['Light mode', 'Dark mode'])
    const v = modes.variables.find((x) => x.name === 'Colors/Background/bg-primary')!
    expect(v.values['Light mode']).toEqual({ v: '#FFFFFF', a: '_Primitives::Colors/Base/white' })
    const brand = source.collections.find((c) => c.name === 'Brand palette')!
    expect(brand.modes).toHaveLength(10)
    expect(brand.variables.find((x) => x.name === 'Brand/600')!.values.Original.v).toBe('#7F56D9')
  })
})

describe('the Untitled theme', () => {
  it('keeps as imported only what Baseline has no screen for yet; colours come from the colour schema', () => {
    expect(untitled.schemaId).toBe('untitled-ui')
    expect(set.collections.map((c) => [c.name, c.variables.length])).toEqual([
      ['_Primitives', 32], ['2. Radius', 11], ['3. Spacing', 17], ['4. Widths', 12], ['5. Containers', 3]
    ])
  })

  it('writes colours from the schema and the rest from the imported collections', () => {
    const sections = exportSections(untitled)
    const css = sections.map((s) => s.css).join('\n')
    expect(css).toContain('--brand-600: #7F56D9;')
    expect(css).toContain('--text-primary: var(--neutral-900);')
    expect(css).toContain('[data-theme="dark"] {')
    expect(css).toContain('--type-text-md-size: 1.000rem;')
    expect(css).toContain('--type-display-2xl-line: 90px;')
    expect(css).toContain("--type-font-body: '")
    expect(css).not.toContain('--primary-10')
    expect(sections.find((s) => s.id === 'ramps')!.count).toBe(27 * 11 + 2)
    expect(sections.find((s) => s.id === 'semantic')!.count).toBe(273)
    // elevation is Baseline's own
    expect(sections.find((s) => s.id === 'elevation')!.count).toBe(untitled.elevation.tokens.length)
    expect(cssName('Spacing/0․5 (2px)')).toBe('--spacing-0-5-2px')
  })

  it('turns the colours into collections named like the Figma files, with aliases', () => {
    const [prim, modes, typo] = schemaCollections(untitled)
    expect(typo.name).toBe('6. Typography')
    expect(typo.variables.find((v) => v.name === 'Font size/display-2xl')!.values.Value.v).toBe(72)
    expect(typo.variables.find((v) => v.name === 'Line height/text-md')!.values.Value.v).toBe(24)
    expect(typo.variables.find((v) => v.name === 'Font family/font-family-body')!.values.Value.v).toBe('Inter')
    expect(typo.variables).toHaveLength(2 + 8 + 11 + 11)
    expect(prim.name).toBe('_Primitives')
    expect(prim.variables.find((v) => v.name === 'Colors/Brand/600')!.values.Style.v).toBe('#7F56D9')
    expect(modes.modes).toEqual(['Light mode', 'Dark mode'])
    expect(modes.variables).toHaveLength(273)
    const bg = modes.variables.find((v) => v.name === 'Colors/Background/bg-primary')!
    expect(bg.values['Light mode']).toEqual({ v: '#FFFFFF', a: '_Primitives::Colors/Base/white' })
    const merged = withSchemaColours(set, untitled)
    expect(merged.collections.map((c) => c.name)).toEqual(['_Primitives', '1. Color modes', '6. Typography', '2. Radius', '3. Spacing', '4. Widths', '5. Containers'])
    // the primitives share one collection with the spacing
    expect(merged.collections[0].variables.some((v) => v.name.startsWith('Spacing/'))).toBe(true)
  })

  it('goes into a multi-theme file next to Default, scoped', () => {
    const out = buildExport([{ name: 'Default', data: defaultThemeData() }, { name: 'Untitled', data: untitled }], 'css', ALL_MODULES)
    expect(out.text).toContain('/* Theme: Untitled */')
    expect(out.text).toContain('[data-brand="untitled"] {')
    expect(out.text).toContain('[data-brand="untitled"][data-theme="dark"] {')
    expect(out.text.split('\n').filter((l) => /^\s*:root/.test(l)).every((l) => l.includes('[data-brand="default"]'))).toBe(true)
    expect(out.count).toBe(exportSections(untitled).reduce((n, s) => n + s.count, 0) + buildExport(defaultThemeData(), 'css', ALL_MODULES).count)
  })

  it('writes the JSON by collection, with modes, aliases and only the chosen modules', () => {
    const doc = importedDoc(withSchemaColours(set, untitled), ['semantic', 'ramps'])
    const imp = doc.Imported as any
    expect(Object.keys(imp).sort()).toEqual(['1. Color modes', '_Primitives'])
    const token = imp['1. Color modes'].Colors.Background['bg-primary']
    expect(token.$type).toBe('color')
    expect(token.$extensions['com.baseline'].alias['Light mode']).toBe('_Primitives::Colors/Base/white')
    expect(imp['_Primitives'].Spacing).toBeUndefined()
    const out = JSON.parse(buildExport([{ name: 'Default', data: defaultThemeData() }, { name: 'Untitled', data: untitled }], 'json', ['type']).text)
    expect(Object.keys(out.Themes.Untitled.Imported)).toEqual(['6. Typography'])
    expect(out.Themes.Default.Type).toBeDefined()
  })
})
