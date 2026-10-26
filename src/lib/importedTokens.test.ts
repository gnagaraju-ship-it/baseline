import { describe, expect, it } from 'vitest'
import full from '../data/untitled-ui.json'
import { exportSections } from './exportAll'
import { ALL_MODULES, buildExport } from './exportBuilder'
import { followers, setImportedOff, addImported, addNamedImported, setImportedAlias, byModule, cssName, importedCount, importedDoc, moduleOf, removeImported, renameImported, resetImported, resolveSet, schemaCollections, setImportedValue, withSchemaColours, type ImportedSet } from './importedTokens'
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

  it('writes exactly the tokens of the files, with the names they have there', () => {
    const sections = exportSections(untitled)
    const css = sections.map((x) => x.css).join('\n')
    expect(css).toContain('--colors-brand-600: #7F56D9;')
    expect(css).toContain('--colors-text-text-primary-900: var(--colors-neutral-900);')
    expect(css).toContain('[data-theme="dark"] {')
    expect(css).toContain('--font-size-text-md: 16px;')
    expect(css).toContain('--line-height-display-2xl: 90px;')
    expect(css).toContain('--font-family-font-family-body: "Inter";')
    expect(css).toContain('--spacing-xs: var(--spacing-1-4px);')
    expect(css).toContain('--radius-md: 8px;')
    expect(css).not.toContain('--primary-10')
    expect(css).not.toContain('--type-')
    expect(css).not.toContain('--grid-')
    expect(sections.find((s) => s.id === 'ramps')!.count).toBe(27 * 11 + 2)
    expect(sections.find((s) => s.id === 'semantic')!.count).toBe(273)
    expect(sections.find((s) => s.id === 'type')!.count).toBe(2 + 8 + 11 + 11)
    expect(sections.find((s) => s.id === 'grids')!.count).toBe(15)
    expect(sections.find((s) => s.id === 'elevation')).toMatchObject({ css: '', count: 0 })
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

describe('editing imported tokens', () => {
  const value = (s: ImportedSet, c: string, n: string, m = 'Mode 1') => resolveSet(s).collections.find((x) => x.name === c)!.variables.find((v) => v.name === n)!.values[m].v
  const spacing = '3. Spacing'

  it('follows an alias to its primitive, so editing the primitive moves the tokens that point at it', () => {
    expect(value(set, spacing, 'spacing-xs')).toBe(4)
    const next = setImportedValue(set, '_Primitives', 'Spacing/1 (4px)', 'Style', 5)
    expect(value(next, spacing, 'spacing-xs')).toBe(5)
    expect(value(next, '4. Widths', 'width-xxs')).toBe(320) // other chains are untouched
    expect(value(set, spacing, 'spacing-xs')).toBe(4) // the original is not changed
  })

  it('a value typed on a token that pointed at another is its own from then on', () => {
    const next = setImportedValue(set, spacing, 'spacing-xs', 'Mode 1', 7)
    const v = next.collections.find((c) => c.name === spacing)!.variables.find((x) => x.name === 'spacing-xs')!
    expect(v.values['Mode 1']).toEqual({ v: 7 })
    expect(value(setImportedValue(next, '_Primitives', 'Spacing/1 (4px)', 'Style', 9), spacing, 'spacing-xs')).toBe(7)
  })

  it('renames a token and repoints the aliases at it; a taken or empty name is refused', () => {
    const next = renameImported(set, '_Primitives', 'Spacing/1 (4px)', 'Spacing/one')
    const xs = next.collections.find((c) => c.name === spacing)!.variables.find((x) => x.name === 'spacing-xs')!
    expect(xs.values['Mode 1'].a).toBe('_Primitives::Spacing/one')
    expect(value(next, spacing, 'spacing-xs')).toBe(4)
    expect(renameImported(set, spacing, 'spacing-xs', 'spacing-md')).toBe(set)
    expect(renameImported(set, spacing, 'spacing-xs', '  ')).toBe(set)
  })

  it('adds a token named like its neighbours, and removes one without breaking the tokens that pointed at it', () => {
    const added = addImported(set, '2. Radius', 3)
    const radius = added.collections.find((c) => c.name === '2. Radius')!
    expect(radius.variables).toHaveLength(12)
    expect(radius.variables[11]).toMatchObject({ name: 'new', values: { 'Mode 1': { v: 3 } } })
    expect(addImported(added, '2. Radius').collections.find((c) => c.name === '2. Radius')!.variables[12].name).toBe('new-2')
    const removed = removeImported(set, '_Primitives', 'Spacing/1 (4px)')
    expect(removed.collections[0].variables.some((v) => v.name === 'Spacing/1 (4px)')).toBe(false)
    expect(value(removed, spacing, 'spacing-xs')).toBe(4)
    expect(removed.collections.find((c) => c.name === spacing)!.variables.find((x) => x.name === 'spacing-xs')!.values['Mode 1'].a).toBeUndefined()
  })

  it('resets one collection and leaves the others alone', () => {
    const edited = setImportedValue(setImportedValue(set, '2. Radius', 'radius-md', 'Mode 1', 99), spacing, 'spacing-xs', 'Mode 1', 1)
    const back = resetImported(edited, set, '2. Radius')
    expect(value(back, '2. Radius', 'radius-md')).toBe(8)
    expect(value(back, spacing, 'spacing-xs')).toBe(1)
  })

  it('exports the edited values: CSS keeps the link, JSON carries the current value with its alias', () => {
    const data = { ...untitled, imported: setImportedValue(set, '_Primitives', 'Spacing/1 (4px)', 'Style', 5) }
    const css = exportSections(data).map((x) => x.css).join('\n')
    expect(css).toContain('--spacing-xs: var(--spacing-1-4px);')
    expect(css).toContain('--spacing-1-4px: 5px;')
    const doc = importedDoc(withSchemaColours(data.imported!, data), ['spacing']) as any
    expect(doc.Imported['3. Spacing']['spacing-xs'].$value).toBe(5)
    expect(doc.Imported['3. Spacing']['spacing-xs'].$extensions['com.baseline'].alias['Mode 1']).toBe('_Primitives::Spacing/1 (4px)')
  })

  it('points a token at another step, and adds a named step once', () => {
    const next = setImportedAlias(set, spacing, 'spacing-xs', 'Mode 1', '_Primitives::Spacing/2 (8px)')
    expect(value(next, spacing, 'spacing-xs')).toBe(8)
    expect(next.collections.find((c) => c.name === spacing)!.variables.find((x) => x.name === 'spacing-xs')!.values['Mode 1'].a).toBe('_Primitives::Spacing/2 (8px)')
    expect(setImportedAlias(set, spacing, 'spacing-xs', 'Mode 1', '_Primitives::Spacing/nope')).toBe(set)
    const added = addNamedImported(set, '_Primitives', 'Spacing/custom (36px)', 36)
    expect(value(added, '_Primitives', 'Spacing/custom (36px)', 'Style')).toBe(36)
    expect(addNamedImported(added, '_Primitives', 'Spacing/custom (36px)', 40).collections[0].variables).toHaveLength(added.collections[0].variables.length)
  })

  it('switches a step off for the export, but not one that a token follows', () => {
    expect(followers(set, '_Primitives', 'Spacing/1 (4px)')).toEqual(['spacing-xs'])
    expect(setImportedOff(set, '_Primitives', 'Spacing/1 (4px)', true)).toBe(set)
    const free = set.collections[0].variables.find((v) => v.name.startsWith('Spacing/') && followers(set, '_Primitives', v.name).length === 0)!
    const off = setImportedOff(set, '_Primitives', free.name, true)
    expect(off.collections[0].variables.find((v) => v.name === free.name)!.off).toBe(true)
    expect(byModule(off).spacing.flatMap((c) => c.variables).some((v) => v.name === free.name)).toBe(false)
    expect(importedDoc(off, ['spacing']).Imported).not.toHaveProperty(['_Primitives', 'Spacing', free.name.replace('Spacing/', '')])
    // switched on again, it is as it was
    expect(JSON.stringify(setImportedOff(off, '_Primitives', free.name, false))).toBe(JSON.stringify(set))
  })
})
