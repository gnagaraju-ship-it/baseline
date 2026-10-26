import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_THEMES, untitledThemeData } from '../lib/themes'
import { currentThemes, pickData, useProject } from './project'

const s = () => useProject.getState()

describe('themes in the store', () => {
  beforeEach(() => s().reset())

  it('starts with one theme called Default', () => {
    expect(s().themes.map((t) => t.name)).toEqual(['Default'])
    expect(s().activeThemeId).toBe(s().themes[0].id)
  })

  it('creates a theme from the defaults, makes it active, and keeps the first theme\'s edits', () => {
    s().setText('primary', '#0EA5E9')
    s().setGridColumns(10)
    s().createTheme('Ocean')
    expect(s().themes.map((t) => t.name)).toEqual(['Default', 'Ocean'])
    expect(s().settings.text.primary).toBe('#9d00d6')
    expect(s().grid.columns.xxl).toBe(12)
    const first = currentThemes(s())[0].data
    expect(first.settings.text.primary).toBe('#0EA5E9')
    expect(first.grid.columns.xxl).toBe(10)
  })

  it('keeps each theme\'s edits independent when switching back and forth', () => {
    const a = s().activeThemeId
    s().setText('primary', '#111111')
    s().createTheme('B')
    const b = s().activeThemeId
    s().setText('primary', '#222222')
    s().setTypeBase(18)
    s().switchTheme(a)
    expect(s().settings.text.primary).toBe('#111111')
    expect(s().type.base).toBe(14)
    s().switchTheme(b)
    expect(s().settings.text.primary).toBe('#222222')
    expect(s().type.base).toBe(18)
  })

  it('keeps every module independent: token remaps, opacity, spacing and elevation', () => {
    const a = s().activeThemeId
    s().setTokenOverride('bg-fill', 'light', 'info-10')
    s().setTokenAlpha('text', 'dark', 40)
    s().toggleSpacingStep(24)
    s().createTheme('B')
    expect(s().tokenOverrides).toEqual({})
    expect(s().tokenAlpha).toEqual({})
    expect(s().spacing.on[24]).toBe(true)
    s().applyElevationPreset('material')
    s().switchTheme(a)
    expect(s().tokenOverrides).toEqual({ 'bg-fill|light': 'info-10' })
    expect(s().tokenAlpha).toEqual({ 'text|dark': 40 })
    expect(s().spacing.on[24]).toBe(false)
    expect(s().elevation.preset).toBe('soft')
  })

  it('does not change shared preferences when switching', () => {
    s().setUnit('pt')
    s().setAppTheme('dark')
    s().setPreviewMode('dark')
    s().createTheme('B')
    expect([s().unit, s().appTheme, s().previewMode]).toEqual(['pt', 'dark', 'dark'])
    s().switchTheme(s().themes[0].id)
    expect([s().unit, s().appTheme, s().previewMode]).toEqual(['pt', 'dark', 'dark'])
  })

  it('closes an open token picker and clears the selection when the theme changes', () => {
    s().openPicker('bg-fill', 'light', 'primary')
    s().select('info', 4)
    s().createTheme('B')
    expect(s().openToken).toBeNull()
    expect(s().selected).toEqual({ key: 'primary', index: 9 })
  })

  it('duplicates a theme with all its data, as an independent copy', () => {
    s().setText('primary', '#abcdef')
    s().duplicateTheme(s().activeThemeId)
    expect(s().themes.map((t) => t.name)).toEqual(['Default', 'Default copy'])
    expect(s().settings.text.primary).toBe('#abcdef')
    s().setText('primary', '#fedcba')
    expect(currentThemes(s())[0].data.settings.text.primary).toBe('#abcdef')
  })

  it('renames with unique names and ignores an empty name', () => {
    s().createTheme('Ocean')
    const [first, second] = s().themes
    s().renameTheme(second.id, '  Default ')
    expect(s().themes[1].name).toBe('Default 2')
    s().renameTheme(second.id, '   ')
    expect(s().themes[1].name).toBe('Default 2')
    s().renameTheme(first.id, 'Default')
    expect(s().themes[0].name).toBe('Default')
  })

  it('deletes a theme, moves to the first one when the active one goes, and never deletes the last', () => {
    s().createTheme('B')
    s().createTheme('C')
    const [a, b, c] = s().themes.map((t) => t.id)
    s().deleteTheme(b)
    expect(s().themes.map((t) => t.id)).toEqual([a, c])
    expect(s().activeThemeId).toBe(c)
    s().deleteTheme(c)
    expect(s().themes.map((t) => t.id)).toEqual([a])
    expect(s().activeThemeId).toBe(a)
    s().deleteTheme(a)
    expect(s().themes).toHaveLength(1)
  })

  it('stops at the maximum number of themes', () => {
    for (let i = 0; i < MAX_THEMES + 3; i++) s().createTheme()
    expect(s().themes).toHaveLength(MAX_THEMES)
    s().duplicateTheme(s().activeThemeId)
    expect(s().themes).toHaveLength(MAX_THEMES)
  })

  it('resets only the active theme', () => {
    s().setText('primary', '#111111')
    s().createTheme('B')
    s().setText('primary', '#222222')
    s().resetTheme()
    expect(s().settings.text.primary).toBe('#9d00d6')
    expect(currentThemes(s())[0].data.settings.text.primary).toBe('#111111')
    expect(s().themes).toHaveLength(2)
  })

  it('saves every theme, with the active one up to date, and restores them on reload', async () => {
    s().setText('primary', '#111111')
    s().createTheme('B')
    s().setText('primary', '#222222')
    const raw = localStorage.getItem('baseline-project')!
    const saved = JSON.parse(raw)
    expect(saved.state.themes.map((t: any) => t.data.settings.text.primary)).toEqual(['#111111', '#222222'])
    expect(saved.state.activeThemeId).toBe(s().activeThemeId)
    // forget the in-memory themes, then load what was saved
    useProject.setState({ themes: [], activeThemeId: 'x' })
    localStorage.setItem('baseline-project', raw)
    await useProject.persist.rehydrate()
    expect(s().themes.map((t) => t.name)).toEqual(['Default', 'B'])
    expect(s().settings.text.primary).toBe('#222222')
    s().switchTheme(s().themes[0].id)
    expect(s().settings.text.primary).toBe('#111111')
  })

  it('migrates a project saved before themes into Default plus Untitled', async () => {
    localStorage.setItem('baseline-project', JSON.stringify({
      version: 2,
      state: { unit: 'px', appTheme: 'dark', settings: { ...s().settings, secondary: '#4852E5' }, grid: { ...s().grid, columns: { xxl: 9, md: 8, xs: 4 } } }
    }))
    await useProject.persist.rehydrate()
    expect(s().themes.map((t) => t.name)).toEqual(['Default', 'Untitled'])
    expect(s().activeThemeId).toBe('theme-1')
    expect(s().unit).toBe('px')
    expect(s().appTheme).toBe('dark')
    expect(s().settings.secondary).toBe('#4852E5')
    expect(s().grid.columns.xxl).toBe(9)
    expect(s().type.base).toBe(14)
    expect(s().settings.utility).toEqual([])
  })

  it('adds Untitled once to a version 3 save, keeps the user\'s themes, and skips it when the name is taken', async () => {
    const mk = (name: string, primary: string) => ({ id: name, name, data: { ...pickData(s()), settings: { ...s().settings, text: { ...s().settings.text, primary } } } })
    localStorage.setItem('baseline-project', JSON.stringify({ version: 3, state: { themes: [mk('Mine', '#111111')], activeThemeId: 'Mine' } }))
    await useProject.persist.rehydrate()
    expect(s().themes.map((t) => t.name)).toEqual(['Mine', 'Untitled'])
    expect(s().activeThemeId).toBe('Mine')
    expect(s().settings.text.primary).toBe('#111111')
    expect(s().themes[1].data.imported?.collections).toHaveLength(8)
    localStorage.setItem('baseline-project', JSON.stringify({ version: 3, state: { themes: [mk('untitled', '#222222')], activeThemeId: 'untitled' } }))
    await useProject.persist.rehydrate()
    expect(s().themes.map((t) => t.name)).toEqual(['untitled'])
  })

  it('turns an unedited version 4 Untitled (mapped onto the generators) into the imported tokens, and leaves an edited one', async () => {
    const mapped = (primary: string) => ({
      id: 'theme-2', name: 'Untitled',
      data: { ...pickData(s()), settings: { ...s().settings, text: { ...s().settings.text, primary } }, type: { ...s().type, headingFont: 'Inter', base: 16 } }
    })
    const def = { id: 'theme-1', name: 'Default', data: pickData(s()) }
    localStorage.setItem('baseline-project', JSON.stringify({ version: 4, state: { themes: [def, mapped('#7F56D9')], activeThemeId: 'theme-1' } }))
    await useProject.persist.rehydrate()
    expect(s().themes[0].data.imported).toBeUndefined()
    expect(s().themes[1].data.imported?.collections.map((c) => c.name)).toHaveLength(8)
    localStorage.setItem('baseline-project', JSON.stringify({ version: 4, state: { themes: [def, mapped('#123456')], activeThemeId: 'theme-1' } }))
    await useProject.persist.rehydrate()
    expect(s().themes[1].data.imported).toBeUndefined()
  })

  it('switching to an imported theme carries its tokens, and resetting it restores them', () => {
    const data = untitledThemeData()
    useProject.setState({ themes: [...s().themes, { id: 'theme-9', name: 'Untitled', data }] })
    s().switchTheme('theme-9')
    expect(s().imported).toBe(data.imported)
    s().switchTheme(s().themes[0].id)
    expect(s().imported).toBeUndefined()
    s().switchTheme('theme-9')
    useProject.setState({ imported: { collections: [] } })
    s().resetTheme()
    expect(s().imported?.collections).toHaveLength(8)
    s().switchTheme(s().themes[0].id)
    s().resetTheme()
    expect(s().imported).toBeUndefined()
  })
})
