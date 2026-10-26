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
    expect(Object.keys(saved.state).sort()).toEqual(['activeSystemId', 'activeThemeId', 'themes'])
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
    expect(count).toBe(7 * 16 + 32 + 58 + 46)
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
    expect(count).toBe(27 * 11 + 2 + 273 + 32)
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
    expect(set.collections.map((c) => [c.name, c.modes.length, c.variables.length])).toEqual([['_Primitives', 1, 27 * 11 + 2], ['1. Color modes', 2, 273], ['6. Typography', 1, 32]])
    const doc = JSON.parse(systemJson(resolved()))
    const token = doc.Imported['1. Color modes'].Colors.Text['text-primary (900)']
    expect(token.$extensions['com.baseline'].alias['Light mode']).toBe('_Primitives::Colors/Neutral/900')
    expect(token.$extensions['com.baseline'].modes['Dark mode']).toBe('#FAFAFA')
  })
})
