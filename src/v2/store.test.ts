import { beforeEach, describe, expect, it } from 'vitest'
import { systemCss } from './export/css'
import { systemJson, systemSet } from './export/json'
import { refOf } from './model'
import { activeResolved, resetV2, useV2 } from './store'

const s = () => useV2.getState()
const resolved = () => activeResolved(s())

describe('v2 store', () => {
  beforeEach(() => { localStorage.clear(); resetV2() })

  it('starts on Default with its base theme', () => {
    expect(s().activeSystemId).toBe('default')
    expect(resolved().system.name).toBe('Default')
    expect(resolved().theme.name).toBe('Base')
  })

  it('switches system, and each system keeps its own themes and edits', () => {
    s().setRamp('primary', '#0EA5E9')
    s().setSystem('untitled')
    expect(resolved().system.name).toBe('Untitled')
    expect(resolved().find(refOf('_Primitives', 'Colors/Brand/600'))!.cells.style.value).toBe('#7F56D9')
    s().setSystem('default')
    expect(resolved().find(refOf('Primitives', 'primary/10'))!.cells.value.value).toBe('#0EA5E9')
  })

  it('creates a theme from the active one, edits it alone, and switches back', () => {
    s().setRamp('primary', '#111111')
    s().addTheme('Ocean')
    expect(resolved().theme.name).toBe('Ocean')
    expect(resolved().theme.ramps.primary).toBe('#111111') // starts as a copy
    s().setRamp('primary', '#222222')
    s().setTheme('base')
    expect(resolved().find(refOf('Primitives', 'primary/10'))!.cells.value.value).toBe('#111111')
    s().setTheme('theme-2')
    expect(resolved().find(refOf('Primitives', 'primary/10'))!.cells.value.value).toBe('#222222')
  })

  it('a new theme copies everything the active one changed: colours, remaps, type and added sizes', () => {
    s().setRamp('primary', '#123456')
    s().setType({ base: 18 })
    s().setStep('body-md', { lh: 33 })
    s().addNumber('Spacing', 'space/36', 36, 'px')
    s().addTheme('Copy')
    const t = resolved().theme
    expect(t.ramps.primary).toBe('#123456')
    expect(t.type).toEqual({ base: 18, steps: { 'body-md': { lh: 33 } } })
    expect(t.added!.Spacing).toHaveLength(1)
    s().setType({ base: 12 })
    s().setTheme('base')
    expect(resolved().theme.type!.base).toBe(18) // the copy is independent
  })

  it('renames with unique names, deletes but never the last, and caps at eight', () => {
    s().addTheme('Ocean')
    s().renameTheme('theme-2', 'base')
    expect(s().themes.default[1].name).toBe('base 2')
    s().renameTheme('theme-2', '  ')
    expect(s().themes.default[1].name).toBe('base 2')
    s().deleteTheme('theme-2')
    expect(s().themes.default).toHaveLength(1)
    s().deleteTheme('base')
    expect(s().themes.default).toHaveLength(1)
    for (let i = 0; i < 10; i++) s().addTheme()
    expect(s().themes.default).toHaveLength(8)
  })

  it('remaps a token, sets its opacity, and resets the theme', () => {
    s().setCell('Semantic', 'bg-fill', 'light', { alias: refOf('Primitives', 'info/10') })
    expect(resolved().find(refOf('Semantic', 'bg-fill'))!.cells.light).toMatchObject({ value: '#2563EB', overridden: true })
    s().setOpacity('Semantic', 'text', 'dark', 40, '#F5F6F8')
    expect(resolved().find(refOf('Semantic', 'text'))!.cells.dark.value).toBe('#F5F6F866')
    s().setOpacity('Semantic', 'text', 'dark', 100, '#F5F6F8')
    expect(resolved().find(refOf('Semantic', 'text'))!.cells.dark.overridden).toBe(false)
    s().resetTheme()
    expect(resolved().find(refOf('Semantic', 'bg-fill'))!.cells.light.overridden).toBe(false)
  })

  it('changes the type of a theme: scale, fonts and single steps, and puts them back', () => {
    const size = () => resolved().find(refOf('Type', 'type/body-md/size'))!.cells.value.value
    expect(size()).toBe(14)
    s().setType({ base: 16, ratio: 1.2, bodyFont: 'Inter' })
    expect(size()).toBe(16)
    expect(resolved().find(refOf('Type', 'type/font/body'))!.cells.value.value).toBe('Inter')
    s().setStep('body-md', { size: 19 })
    expect(size()).toBe(19)
    s().setStep('body-md', { size: undefined })
    expect(size()).toBe(16)
    expect(resolved().theme.type?.steps).toEqual({})
    s().setType({ base: undefined, ratio: undefined, bodyFont: undefined })
    expect(size()).toBe(14)
    s().setStep('body-md', { lh: 40 })
    s().resetTheme()
    expect(resolved().find(refOf('Type', 'type/body-md/line'))!.cells.value.value).toBe(24)
  })

  it('a fixed system keeps its own sizes whatever the scale controls say', () => {
    s().setSystem('untitled')
    s().setType({ base: 20, ratio: 1.5 })
    expect(resolved().find(refOf('6. Typography', 'Font size/text-md'))!.cells.value.value).toBe(16)
    s().setStep('text-md', { size: 17 })
    expect(resolved().find(refOf('6. Typography', 'Font size/text-md'))!.cells.value.value).toBe(17)
  })

  it('saves only themes and the choices, and restores them on reload', async () => {
    s().setRamp('primary', '#0EA5E9')
    s().addTheme('Ocean')
    const raw = localStorage.getItem('baseline-v2')!
    const saved = JSON.parse(raw)
    expect(saved.version).toBe(1)
    expect(Object.keys(saved.state).sort()).toEqual(['activeSystemId', 'activeThemeId', 'custom', 'themes'])
    expect(raw.length).toBeLessThan(5000)
    resetV2()
    localStorage.setItem('baseline-v2', raw)
    await useV2.persist.rehydrate()
    expect(resolved().theme.name).toBe('Ocean')
    expect(s().themes.default.map((t) => t.name)).toEqual(['Base', 'Ocean'])
  })

  it('does not touch what v1 saves', () => {
    localStorage.setItem('baseline-project', 'v1 data')
    s().setRamp('primary', '#0EA5E9')
    expect(localStorage.getItem('baseline-project')).toBe('v1 data')
  })
})

describe('v2 exports', () => {
  beforeEach(() => { localStorage.clear(); resetV2() })

  it('CSS: names from the policy, links as var(), modes as selectors', () => {
    const { css, count } = systemCss(resolved())
    expect(css).toContain('--primary-10: #9D00D6;')
    expect(css).toContain('--bg-fill: var(--primary-10);')
    expect(css).toContain('[data-theme="dark"] {')
    expect(css).toContain('--bg-fill: var(--primary-9);')
    expect(count).toBe(7 * 16 + 32 + 58 + 46 + 17 + 5 + 5)
    expect(systemCss(resolved(), ['Semantic']).css).not.toContain('--primary-10: #')
  })

  it('CSS: type with units, names from the policy', () => {
    const css = systemCss(resolved(), ['Type']).css
    expect(css).toContain('--type-body-md-size: 14px;')
    expect(css).toContain('--type-body-md-track: 0em;')
    expect(css).toContain('--type-body-md-weight: 400;')
    expect(css).toContain('--type-font-heading: "Raleway";')
    s().setSystem('untitled')
    const u = systemCss(resolved(), ['6. Typography']).css
    expect(u).toContain('--font-size-text-md: 16px;')
    expect(u).toContain('--line-height-display-2xl: 90px;')
    expect(u).toContain('--font-family-font-family-body: "Inter";')
    expect(u).not.toContain('-track')
  })

  it('CSS: Untitled uses the names of its files', () => {
    s().setSystem('untitled')
    const { css, count } = systemCss(resolved())
    expect(css).toContain('--colors-brand-600: #7F56D9;')
    expect(css).toContain('--colors-text-text-primary-900: var(--colors-neutral-900);')
    expect(count).toBe(27 * 11 + 2 + 32 + 273 + 32 + 11 + 17 + 12 + 3)
  })

  it('CSS follows the theme: a new brand colour reaches the ramp and nothing else changes', () => {
    s().setSystem('untitled')
    s().setRamp('brand', '#0EA5E9')
    const css = systemCss(resolved()).css
    expect(css).toContain('--colors-brand-600: #0EA5E9;')
    expect(css).toContain('--colors-red-600: #DC2626;')
  })

  it('JSON: the collections the Figma plugin imports, with modes and links', () => {
    s().setSystem('untitled')
    const set = systemSet(resolved())
    expect(set.collections.map((c) => [c.name, c.modes.length, c.variables.length])).toEqual([['_Primitives', 1, 27 * 11 + 2 + 32], ['1. Color modes', 2, 273], ['6. Typography', 1, 32], ['2. Radius', 1, 11], ['3. Spacing', 1, 17], ['4. Widths', 1, 12], ['5. Containers', 1, 3]])
    const doc = JSON.parse(systemJson(resolved()))
    const token = doc.Imported['1. Color modes'].Colors.Text['text-primary (900)']
    expect(token.$extensions['com.baseline'].alias['Light mode']).toBe('_Primitives::Colors/Neutral/900')
    expect(token.$extensions['com.baseline'].modes['Dark mode']).toBe('#FAFAFA')
  })
})

describe('v2 sizes', () => {
  beforeEach(() => { localStorage.clear(); resetV2() })

  it('Default: its spacing scale and grid are data, equal to v1', () => {
    const r = resolved()
    expect(r.system.dimensions!.map((d) => d.id)).toEqual(['space', 'grid'])
    expect(r.find(refOf('Spacing', 'space/16'))!.cells.value.value).toBe(16)
    expect(r.find(refOf('Spacing', 'space/6'))).toBeUndefined() // off in v1's 4px base
    const columns = r.find(refOf('Grid', 'grid/columns'))!
    expect(r.collections.find((c) => c.name === 'Grid')!.modes.map((m) => m.name)).toEqual(['XXL', 'MD', 'XS'])
    expect([columns.cells.xxl.value, columns.cells.md.value, columns.cells.xs.value]).toEqual([12, 8, 4])
    expect(r.find(refOf('Grid', 'grid/width'))!.cells.md.value).toBe(768)
    expect(systemCss(r, ['Spacing']).css).toContain('--space-16: 16px;')
    expect(systemCss(r, ['Grid']).css).toContain('--grid-columns: 12;')
    expect(systemCss(r, ['Grid']).css).toContain('[data-grid="md"] {')
  })

  it('Untitled: scale, tokens that follow it, radius, widths and containers', () => {
    s().setSystem('untitled')
    const r = resolved()
    expect(r.system.dimensions!.map((d) => d.id)).toEqual(['scale', 'spacing', 'radius', 'widths', 'containers'])
    expect(r.find(refOf('3. Spacing', 'spacing-xs'))!.cells['mode-1']).toMatchObject({ value: 4, alias: refOf('_Primitives', 'Spacing/1 (4px)') })
    expect(r.find(refOf('4. Widths', 'width-xxs'))!.cells['mode-1'].value).toBe(320)
    expect(r.find(refOf('2. Radius', 'radius-full'))!.cells['mode-1'].value).toBe(9999)
    expect(r.find(refOf('5. Containers', 'container-padding-desktop'))!.cells.value.value).toBe(32)
    const css = systemCss(r, ['3. Spacing']).css
    expect(css).toContain('--spacing-xs: var(--spacing-1-4px);')
  })

  it('editing a value in the scale moves the tokens that follow it, in this theme only', () => {
    s().setSystem('untitled')
    s().setCell('_Primitives', 'Spacing/1 (4px)', 'style', { value: 6 })
    expect(resolved().find(refOf('3. Spacing', 'spacing-xs'))!.cells['mode-1'].value).toBe(6)
    s().addTheme('Other')
    s().setCell('_Primitives', 'Spacing/1 (4px)', 'style', null)
    expect(resolved().find(refOf('3. Spacing', 'spacing-xs'))!.cells['mode-1'].value).toBe(4)
    s().setTheme('base')
    expect(resolved().find(refOf('3. Spacing', 'spacing-xs'))!.cells['mode-1'].value).toBe(6)
  })

  it('a token can follow another step, or take a value of its own', () => {
    s().setSystem('untitled')
    s().setCell('3. Spacing', 'spacing-xs', 'mode-1', { alias: refOf('_Primitives', 'Spacing/2 (8px)') })
    expect(resolved().find(refOf('3. Spacing', 'spacing-xs'))!.cells['mode-1'].value).toBe(8)
    s().setCell('3. Spacing', 'spacing-xs', 'mode-1', { value: 9 })
    expect(resolved().find(refOf('3. Spacing', 'spacing-xs'))!.cells['mode-1']).toMatchObject({ value: 9, overridden: true })
    expect(resolved().find(refOf('3. Spacing', 'spacing-xs'))!.cells['mode-1'].alias).toBeUndefined()
  })

  it('adds a value to a scale for the theme, and removes it again', () => {
    s().addNumber('Spacing', 'space/36', 36, 'px')
    s().addNumber('Spacing', 'space/36', 40, 'px') // a path in use is ignored
    expect(resolved().find(refOf('Spacing', 'space/36'))!.cells.value.value).toBe(36)
    expect(systemCss(resolved(), ['Spacing']).css).toContain('--space-36: 36px;')
    s().setCell('Spacing', 'space/36', 'value', { value: 37 })
    expect(resolved().find(refOf('Spacing', 'space/36'))!.cells.value.value).toBe(37)
    s().addTheme('Other')
    expect(resolved().find(refOf('Spacing', 'space/36'))!.cells.value.value).toBe(37) // a new theme starts as a copy of the active one
  })

  it('grid values per breakpoint can be set, and the added value goes away with Remove', () => {
    s().setCell('Grid', 'grid/columns', 'md', { value: 6 })
    const c = resolved().find(refOf('Grid', 'grid/columns'))!
    expect([c.cells.xxl.value, c.cells.md.value, c.cells.xs.value]).toEqual([12, 6, 4])
    s().addNumber('Spacing', 'space/50', 50, 'px')
    s().removeAdded('Spacing', 'space/50')
    expect(resolved().find(refOf('Spacing', 'space/50'))).toBeUndefined()
  })
})

describe('v2 elevation', () => {
  beforeEach(() => { localStorage.clear(); resetV2() })
  const e = () => resolved().elevation!

  it('Default has v1\'s soft shadows, Untitled has none', () => {
    expect(e().preset).toBe('soft')
    expect(e().tokens.map((t) => t.name)).toEqual(['xs', 'sm', 'md', 'lg', 'xl'])
    expect(e().shadow).toBe('#000000')
    s().setSystem('untitled')
    expect(resolved().elevation).toBeUndefined()
    expect(resolved().system.elevation).toBeUndefined()
  })

  it('a preset replaces the levels, a layer edit makes it custom, and the theme keeps its own', () => {
    s().setElevationPreset('material')
    expect(e().preset).toBe('material')
    expect(e().tokens).toHaveLength(9)
    s().setLayer(0, 0, 'blur', '7')
    expect(e().preset).toBe('custom')
    expect(e().tokens[0].layers[0].blur).toBe(7)
    s().addTheme('Other')
    s().setElevationPreset('carbon')
    expect(e().tokens.map((t) => t.name)).toEqual(['low', 'raised', 'overlay'])
    s().setTheme('base')
    expect(e().tokens).toHaveLength(9)
    expect(e().tokens[0].layers[0].blur).toBe(7)
  })

  it('layers and levels can be added, renamed and removed; the last layer and level stay', () => {
    s().addElevationLayer(0)
    expect(e().tokens[0].layers).toHaveLength(2)
    s().removeElevationLayer(0, 1)
    s().removeElevationLayer(0, 0)
    expect(e().tokens[0].layers).toHaveLength(1)
    s().addElevationLevel()
    expect(e().tokens.at(-1)!.name).toBe('level-6')
    s().renameElevationLevel(5, 'floating')
    expect(e().tokens.at(-1)!.name).toBe('floating')
    s().removeElevationLevel(5)
    expect(e().tokens).toHaveLength(5)
    s().setShadowColour('#112233')
    expect(e().shadow).toBe('#112233')
    s().resetTheme()
    expect(e().preset).toBe('soft')
    expect(e().shadow).toBe('#000000')
  })

  it('CSS and JSON carry the shadows', () => {
    const css = systemCss(resolved(), ['Elevation']).css
    expect(css).toContain('--elevation-md: 0px 6px 16px 0px rgba(0, 0, 0, 0.12);')
    expect(systemCss(resolved(), ['Primitives']).css).not.toContain('--elevation')
    const doc = JSON.parse(systemJson(resolved(), ['Elevation']))
    expect(doc.Elevation.md).toEqual({ $type: 'shadow', $value: [{ color: '#0000001F', offsetX: '0px', offsetY: '6px', blur: '16px', spread: '0px' }] })
    expect(JSON.parse(systemJson(resolved(), ['Primitives'])).Elevation).toBeUndefined()
  })
})
