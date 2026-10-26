import { beforeEach, describe, expect, it } from 'vitest'
import { refOf } from '../model'
import { activeResolved, resetV2, useV2 } from '../store'
import { resolveThemes, themesCss, themesJson, themesSet } from './themes'

const s = () => useV2.getState()
const themes = (ids?: string[]) => resolveThemes(activeResolved(s()).system, ids)
const mode = (set: ReturnType<typeof themesSet>, collection: string) => set.collections.find((c) => c.name === collection)!

describe('themes as Figma modes', () => {
  beforeEach(() => { localStorage.clear(); resetV2(); s().setSystem('untitled') })

  it('one theme is exactly the plain export', () => {
    const set = themesSet(themes())
    expect(set.collections.find((c) => c.name === '_Primitives')!.modes).toEqual(['Style'])
    expect(set.collections.find((c) => c.name === '1. Color modes')!.modes).toEqual(['Light mode', 'Dark mode'])
  })

  it('a new brand colour gives the ramps a mode per theme and leaves the others with their own modes', () => {
    s().addTheme('Sky')
    s().setRamp('brand', '#0EA5E9')
    const set = themesSet(themes())
    expect(mode(set, '_Primitives').modes).toEqual(['Base', 'Sky'])
    // the tokens link to the ramps, so they hold the same cells in every theme
    expect(mode(set, '1. Color modes').modes).toEqual(['Light mode', 'Dark mode'])
    expect(mode(set, '6. Typography').modes).toEqual(['Value'])
    expect(mode(set, '3. Spacing').modes).toEqual(['Mode 1'])
    const brand = mode(set, '_Primitives').variables.find((v) => v.name === 'Colors/Brand/600')!
    expect(brand.values).toEqual({ Base: { v: '#7F56D9' }, Sky: { v: '#0EA5E9' } })
    // a ramp that did not change is the same in both modes
    const red = mode(set, '_Primitives').variables.find((v) => v.name === 'Colors/Red/600')!
    expect(red.values.Base.v).toBe(red.values.Sky.v)
  })

  it('a different remap gives that collection a mode per theme and mode', () => {
    s().addTheme('Alt')
    s().setCell('1. Color modes', 'Colors/Text/text-primary (900)', 'light', { alias: refOf('_Primitives', 'Colors/Brand/900') })
    const set = themesSet(themes())
    expect(mode(set, '1. Color modes').modes).toEqual(['Base / Light mode', 'Base / Dark mode', 'Alt / Light mode', 'Alt / Dark mode'])
    const t = mode(set, '1. Color modes').variables.find((v) => v.name === 'Colors/Text/text-primary (900)')!
    expect(t.values['Base / Light mode'].a).toBe(refOf('_Primitives', 'Colors/Neutral/900'))
    expect(t.values['Alt / Light mode'].a).toBe(refOf('_Primitives', 'Colors/Brand/900'))
    expect(t.values['Alt / Dark mode'].a).toBe(refOf('_Primitives', 'Colors/Neutral/50'))
    expect(mode(set, '_Primitives').modes).toEqual(['Style'])
  })

  it('type, sizes and added values differ per theme only where they changed', () => {
    s().addTheme('Big')
    s().setType({ headingFont: 'Georgia' })
    s().addNumber('_Primitives', 'Spacing/custom (36px)', 36, 'px')
    s().setCell('2. Radius', 'radius-md', 'mode-1', { value: 10 })
    const set = themesSet(themes())
    expect(mode(set, '6. Typography').modes).toEqual(['Base', 'Big'])
    expect(mode(set, '2. Radius').modes).toEqual(['Base', 'Big'])
    expect(mode(set, '4. Widths').modes).toEqual(['Mode 1'])
    const custom = mode(set, '_Primitives').variables.find((v) => v.name === 'Spacing/custom (36px)')!
    expect(custom.values).toEqual({ Base: { v: 36 }, Big: { v: 36 } }) // a theme without it takes the value of the one that has it
    const font = mode(set, '6. Typography').variables.find((v) => v.name === 'Font family/font-family-display')!
    expect(font.values).toEqual({ Base: { v: 'Inter' }, Big: { v: 'Georgia' } })
  })

  it('the JSON is what the plugin reads, and the chosen themes and collections are the only ones in it', () => {
    s().addTheme('Sky')
    s().setRamp('brand', '#0EA5E9')
    const doc = JSON.parse(themesJson(themes(), ['_Primitives']))
    expect(Object.keys(doc.Imported)).toEqual(['_Primitives'])
    expect(doc.Imported._Primitives.$extensions['com.baseline'].modes).toEqual(['Base', 'Sky'])
    const only = JSON.parse(themesJson(themes(['base'])))
    expect(only.Imported._Primitives.$extensions['com.baseline'].modes).toEqual(['Style'])
  })

  it('CSS: the first theme answers to :root, each theme to its own data-brand', () => {
    s().addTheme('Sky Blue')
    s().setRamp('brand', '#0EA5E9')
    const { css } = themesCss(themes(), ['_Primitives', '1. Color modes'])
    expect(css).toContain('/* Theme: Base */')
    expect(css).toContain('/* Theme: Sky Blue */')
    expect(css).toContain(':root, [data-brand="base"] {')
    expect(css).toContain('[data-brand="sky-blue"] {')
    expect(css).toContain('[data-theme="dark"], [data-brand="base"][data-theme="dark"] {')
    expect(css).toContain('[data-brand="sky-blue"][data-theme="dark"] {')
    const sky = css.slice(css.indexOf('/* Theme: Sky Blue */'))
    expect(sky).toContain('--colors-brand-600: #0EA5E9;')
    expect(css.split('\n').filter((l) => /^\s*:root/.test(l)).every((l) => l.includes('[data-brand="base"]'))).toBe(true)
    expect(themesCss(themes(['base']), ['_Primitives']).css).not.toContain('data-brand')
  })

  it('shadows go once when the themes agree, and in a folder per theme when they differ', () => {
    s().setSystem('default')
    s().addTheme('Hard')
    expect(JSON.parse(themesJson(themes(), ['Elevation'])).Elevation).toHaveProperty('md')
    s().setElevationPreset('carbon')
    const doc = JSON.parse(themesJson(themes(), ['Elevation']))
    expect(Object.keys(doc.Elevation)).toEqual(['Base', 'Hard'])
    expect(Object.keys(doc.Elevation.Hard)).toEqual(['low', 'raised', 'overlay'])
    const css = themesCss(themes(), ['Elevation']).css
    expect(css).toContain('[data-brand="hard"] {')
    expect(css).toContain('--elevation-raised:')
  })
})
