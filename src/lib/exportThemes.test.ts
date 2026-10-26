import { describe, expect, it } from 'vitest'
import { exportAll, exportSections, scopeCss, themedSections } from './exportAll'
import { buildExport } from './exportBuilder'
import { cloneData, defaultThemeData } from './themes'

const base = defaultThemeData()
const ocean = cloneData(base)
ocean.settings.text.primary = '#0EA5E9'
ocean.grid.columns.xxl = 8

describe('multi-theme export', () => {
  it('one theme is exactly the plain export', () => {
    expect(themedSections([{ name: 'Default', data: base }])).toEqual(exportSections(base))
    const one = buildExport([{ name: 'Default', data: base }], 'css', ['ramps', 'semantic', 'type', 'grids', 'spacing', 'elevation'])
    expect(one.text).toBe(exportAll(base).css)
    expect(one.count).toBe(exportAll(base).count)
    expect(buildExport(base, 'json', ['type']).text).toBe(buildExport([{ name: 'Default', data: base }], 'json', ['type']).text)
  })

  it('scopes selectors: the first theme is also :root, the others only answer to their data-brand', () => {
    const css = ':root {\n  --a: 1;\n}\n[data-theme="dark"] {\n  --a: 2;\n}\n@media (min-width: 768px) {\n  :root {\n    --a: 3;\n  }\n}\n'
    expect(scopeCss(css, 'x', true)).toContain(':root, [data-brand="x"] {')
    expect(scopeCss(css, 'x', true)).toContain('[data-theme="dark"], [data-brand="x"][data-theme="dark"] {')
    const second = scopeCss(css, 'y', false)
    expect(second).not.toContain(':root')
    expect(second).toContain('[data-brand="y"] {')
    expect(second).toContain('[data-brand="y"][data-theme="dark"] {')
    expect(second).toContain('  [data-brand="y"] {\n    --a: 3;')
  })

  it('writes every theme into one CSS file with no unscoped leakage and adds the counts', () => {
    const out = buildExport([{ name: 'Default', data: base }, { name: 'Ocean Blue', data: ocean }], 'css', ['ramps', 'semantic', 'type', 'grids', 'spacing', 'elevation'])
    expect(out.text).toContain('/* Theme: Default */')
    expect(out.text).toContain('/* Theme: Ocean Blue */')
    expect(out.text).toContain('[data-brand="ocean-blue"][data-theme="dark"] {')
    expect(out.text).toContain(':root, [data-brand="default"] {')
    const rootLines = out.text.split('\n').filter((l) => /^\s*:root/.test(l))
    expect(rootLines.every((l) => l.includes('[data-brand="default"]'))).toBe(true)
    expect(out.count).toBe(exportAll(base).count + exportAll(ocean).count)
  })

  it('writes a Themes document with every theme in the JSON', () => {
    const out = buildExport([{ name: 'Default', data: base }, { name: 'Ocean', data: ocean }], 'json', ['ramps', 'semantic'])
    const doc = JSON.parse(out.text)
    expect(doc.$extensions['com.baseline'].themes).toEqual(['Default', 'Ocean'])
    expect(Object.keys(doc.Themes)).toEqual(['Default', 'Ocean'])
    expect(Object.keys(doc.Themes.Ocean).filter((k) => !k.startsWith('$')).sort()).toEqual(['Primitives', 'Semantic'])
    expect(JSON.stringify(doc.Themes.Default)).not.toEqual(JSON.stringify(doc.Themes.Ocean))
    expect(doc.Primitives).toBeUndefined()
  })
})
