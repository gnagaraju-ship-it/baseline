import { describe, expect, it } from 'vitest'
import { defaultSettings } from './colour'
import { defaultElevationSettings } from './elevation'
import type { ExportInput } from './exportAll'
import { ALL_MODULES, buildExport } from './exportBuilder'
import { PLUGIN_FILES, PLUGIN_FOLDER, pluginZip } from './figmaPlugin'
import { defaultGridSettings } from './grid'
import { defaultSpacingSettings } from './spacing'
import { defaultTypeSettings } from './typeScale'

const input = (): ExportInput => ({
  settings: defaultSettings(), tokenOverrides: {}, type: defaultTypeSettings(), grid: defaultGridSettings(),
  spacing: defaultSpacingSettings(), elevation: defaultElevationSettings()
})
const file = (n: string) => PLUGIN_FILES.find((f) => f.name === `${PLUGIN_FOLDER}/${n}`)!.data

const font = (family: string, styles: string[]) => styles.map((style) => ({ fontName: { family, style } }))
const FONTS = [
  ...font('Raleway', ['Regular', 'Medium', 'SemiBold', 'Bold', 'Italic', 'Medium Italic']),
  ...font('Nunito', ['Regular', 'Medium', 'Semi Bold', 'Bold']),
  ...font('Inter', ['Regular'])
]

// --- a small in-memory Figma to run the plugin code against ---------------------------------------------------
function mockFigma() {
  let id = 0
  const collections: any[] = []
  const variables: any[] = []
  const styles: any[] = []
  const posted: any[] = []
  const notes: string[] = []
  const textStyles: any[] = []
  const loaded: any[] = []
  const figma: any = {
    showUI: () => {},
    notify: (m: string) => notes.push(m),
    closePlugin: () => {},
    ui: { postMessage: (m: any) => posted.push(m), onmessage: null as any },
    listAvailableFontsAsync: async () => FONTS,
    loadFontAsync: async (f: any) => { loaded.push(f) },
    getLocalTextStylesAsync: async () => textStyles.slice(),
    createTextStyle: () => {
      const t: any = {
        id: `T${++id}`, name: '', bound: {} as Record<string, any>,
        setBoundVariable(field: string, v: any) { this.bound[field] = v.id }
      }
      textStyles.push(t)
      return t
    },
    createEffectStyle: () => { const s = { id: `S${++id}`, name: '', effects: [] }; styles.push(s); return s },
    getLocalEffectStylesAsync: async () => styles.slice(),
    variables: {
      getLocalVariableCollectionsAsync: async () => collections.slice(),
      getLocalVariablesAsync: async () => variables.slice(),
      createVariableCollection: (name: string) => {
        const c: any = {
          id: `C${++id}`, name, modes: [{ modeId: `M${++id}`, name: 'Mode 1' }],
          renameMode(mid: string, n: string) { this.modes.find((m: any) => m.modeId === mid).name = n },
          addMode(n: string) { this.modes.push({ modeId: `M${++id}`, name: n }) }
        }
        collections.push(c)
        return c
      },
      createVariable: (name: string, c: any, type: string) => {
        const v: any = {
          id: `V${++id}`, name, resolvedType: type, variableCollectionId: c.id, valuesByMode: {}, scopes: ['ALL_SCOPES'], codeSyntax: {}, description: '',
          setValueForMode(m: string, val: any) { this.valuesByMode[m] = val },
          setVariableCodeSyntax(k: string, val: string) { this.codeSyntax[k] = val }
        }
        variables.push(v)
        return v
      },
      createVariableAlias: (v: any) => ({ type: 'VARIABLE_ALIAS', id: v.id })
    }
  }
  return { figma, collections, variables, styles, posted, notes, textStyles, loaded }
}

function loadPlugin() {
  const m = mockFigma()
  new Function('figma', '__html__', file('code.js'))(m.figma, '<html></html>')
  const send = async (msg: any) => {
    await m.figma.ui.onmessage(msg)
  }
  const doc = JSON.parse(buildExport(input(), 'json', ALL_MODULES).text)
  return { ...m, send, doc }
}

describe('plugin package', () => {
  it('has the manifest, code, UI and README, and a UI with an Import button', () => {
    expect(PLUGIN_FILES.map((f) => f.name)).toEqual([
      `${PLUGIN_FOLDER}/manifest.json`, `${PLUGIN_FOLDER}/code.js`, `${PLUGIN_FOLDER}/ui.html`, `${PLUGIN_FOLDER}/README.md`
    ])
    const manifest = JSON.parse(file('manifest.json'))
    expect(manifest).toMatchObject({ main: 'code.js', ui: 'ui.html', editorType: ['figma'], documentAccess: 'dynamic-page', api: '1.0.0' })
    expect(manifest.name).toContain('Import tokens')
    expect(file('ui.html')).toMatch(/<button id="import"[^>]*>Import<\/button>/)
    expect(file('ui.html')).toContain('type="file"')
    expect(pluginZip().length).toBeGreaterThan(10000)
  })

  it('code and UI scripts are valid JavaScript', () => {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
    expect(() => new AsyncFunction('figma', '__html__', file('code.js'))).not.toThrow()
    const script = /<script>([\s\S]*)<\/script>/.exec(file('ui.html'))![1]
    expect(() => new Function(script)).not.toThrow()
  })
})

describe('plugin import', () => {
  it('creates every collection, variable and shadow style from the exported file', async () => {
    const p = loadPlugin()
    await p.send({ type: 'import', doc: p.doc, groups: ['Primitives', 'Semantic', 'Type', 'Grid', 'Spacing', 'Elevation'] })
    const done = p.posted.find((m) => m.type === 'done')
    expect(p.posted.find((m) => m.type === 'error')).toBeUndefined()
    expect(p.collections.map((c) => c.name)).toEqual(['Primitives', 'Semantic', 'Type', 'Grid', 'Spacing'])
    const count = (name: string) => p.variables.filter((v) => v.variableCollectionId === p.collections.find((c) => c.name === name).id).length
    expect(count('Primitives')).toBe(112 + 32)
    expect(count('Semantic')).toBe(58)
    expect(count('Type')).toBe(2 + 11 * 5)
    expect(count('Grid')).toBe(18)
    expect(count('Spacing')).toBe(17 + 36)
    expect(p.styles.map((s) => s.name)).toEqual(['elevation/xs', 'elevation/sm', 'elevation/md', 'elevation/lg', 'elevation/xl'])
    expect(done.result).toEqual({ created: 144 + 58 + 57 + 18 + 53, updated: 0, styles: 5, textStyles: 11, missingFonts: [] })
    expect(p.notes[0]).toContain('created')
  })

  it('gives Semantic its Light and Dark modes with aliases to primitives, and literals for opacity values', async () => {
    const i = input()
    i.tokenAlpha = { 'bg-fill|dark': 60 }
    const p = loadPlugin()
    const doc = JSON.parse(buildExport(i, 'json', ALL_MODULES).text)
    await p.send({ type: 'import', doc, groups: ['Primitives', 'Semantic'] })
    const sem = p.collections.find((c) => c.name === 'Semantic')
    expect(sem.modes.map((m: any) => m.name)).toEqual(['Light', 'Dark'])
    const fill = p.variables.find((v) => v.name === 'colour/bg-fill')
    const [light, dark] = sem.modes.map((m: any) => fill.valuesByMode[m.modeId])
    const primary10 = p.variables.find((v) => v.name === 'colour/primary/10')
    expect(light).toEqual({ type: 'VARIABLE_ALIAS', id: primary10.id })
    expect(dark.a).toBeCloseTo(0.6, 2)
    expect(dark.r).toBeCloseTo(0xad / 255, 3)
  })

  it('sets scopes, CSS names, descriptions and colour values', async () => {
    const p = loadPlugin()
    await p.send({ type: 'import', doc: p.doc, groups: ['Primitives', 'Semantic', 'Type', 'Spacing'] })
    const v = (n: string) => p.variables.find((x) => x.name === n)
    expect(v('colour/primary/10').scopes).toEqual([])
    expect(v('colour/primary/10').codeSyntax.WEB).toBe('var(--primary-10)')
    const prim = p.collections.find((c) => c.name === 'Primitives')
    expect(v('colour/primary/10').valuesByMode[prim.modes[0].modeId]).toMatchObject({ a: 1 })
    expect(v('colour/text').scopes).toEqual(['TEXT_FILL'])
    expect(v('colour/border-brand').scopes).toEqual(['STROKE_COLOR'])
    expect(v('colour/bg-fill').scopes).toEqual(['FRAME_FILL', 'SHAPE_FILL'])
    expect(v('heading-xl/size').scopes).toEqual(['FONT_SIZE'])
    expect(v('heading-xl/size').codeSyntax.WEB).toBe('var(--type-heading-xl-size)')
    expect(v('heading-xl/line-height').codeSyntax.WEB).toBe('var(--type-heading-xl-line)')
    expect(v('heading-xl/letter-spacing').description).toBe('px = em x font size')
    expect(v('space/24').scopes).toEqual(['GAP'])
    expect(v('space/24').codeSyntax.WEB).toBe('var(--space-24)')
    expect(v('stack-md/xxl').codeSyntax.WEB).toBe('var(--stack-md-xxl)')
    expect(v('colour/black-alpha/5').codeSyntax.WEB).toBeUndefined()
  })

  it('creates font family (text) and font weight variables, and points every step at its font role', async () => {
    const p = loadPlugin()
    await p.send({ type: 'import', doc: p.doc, groups: ['Type'] })
    const v = (n: string) => p.variables.find((x) => x.name === n)
    const value = (n: string) => Object.values(v(n).valuesByMode)[0] as any
    expect(v('font-family/heading').resolvedType).toBe('STRING')
    expect(value('font-family/heading')).toBe('Raleway')
    expect(value('font-family/body')).toBe('Nunito')
    expect(v('font-family/heading').scopes).toEqual(['FONT_FAMILY'])
    expect(v('font-family/heading').codeSyntax.WEB).toContain('--type-font-heading')
    expect(v('heading-xl/family').resolvedType).toBe('STRING')
    expect(value('heading-xl/family')).toEqual({ type: 'VARIABLE_ALIAS', id: v('font-family/heading').id })
    expect(value('body-md/family')).toEqual({ type: 'VARIABLE_ALIAS', id: v('font-family/body').id })
    expect(v('heading-xl/family').codeSyntax.WEB).toBe('var(--type-heading-xl-family)')
    expect(v('heading-xl/weight').resolvedType).toBe('FLOAT')
    expect(value('heading-xl/weight')).toBe(500)
    expect(value('body-md/weight')).toBe(400)
    expect(v('body-md/weight').scopes).toEqual(['FONT_WEIGHT'])
    expect(v('body-md/weight').codeSyntax.WEB).toBe('var(--type-body-md-weight)')
  })

  it('stores letter spacing as pixels (em x font size), the way Figma reads a bound variable', async () => {
    const p = loadPlugin()
    await p.send({ type: 'import', doc: p.doc, groups: ['Type'] })
    const px = (n: string) => Object.values(p.variables.find((x) => x.name === n)!.valuesByMode)[0]
    expect(px('heading-xl/letter-spacing')).toBeCloseTo(-0.25, 3)
    expect(px('label-xs/letter-spacing')).toBeCloseTo(0.1, 3)
    expect(px('body-md/letter-spacing')).toBe(0)
  })

  it('creates one text style per step with the right font style, size, line height and bound variables', async () => {
    const p = loadPlugin()
    await p.send({ type: 'import', doc: p.doc, groups: ['Type'] })
    expect(p.textStyles).toHaveLength(11)
    const heading = p.textStyles.find((t) => t.name === 'type/heading-xl')
    expect(heading.fontName).toEqual({ family: 'Raleway', style: 'Medium' })
    expect(heading.fontSize).toBe(25)
    expect(heading.lineHeight).toEqual({ unit: 'PIXELS', value: 32 })
    expect(heading.letterSpacing).toEqual({ unit: 'PIXELS', value: -0.25 })
    expect(Object.keys(heading.bound).sort()).toEqual(['fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'lineHeight'])
    expect(heading.bound.fontSize).toBe(p.variables.find((x) => x.name === 'heading-xl/size').id)
    expect(p.textStyles.find((t) => t.name === 'type/body-md').fontName).toEqual({ family: 'Nunito', style: 'Regular' })
    expect(p.loaded.length).toBeGreaterThanOrEqual(11)
    expect(p.posted.at(-1).result).toMatchObject({ textStyles: 11, missingFonts: [] })
  })

  it('makes a text style for a weight variant, matching "Semi Bold" and "SemiBold" font styles', async () => {
    const i = input()
    i.type.variants = { 'body-md': [600], 'heading-md': [600] }
    const p = loadPlugin()
    await p.send({ type: 'import', doc: JSON.parse(buildExport(i, 'json', ALL_MODULES).text), groups: ['Type'] })
    const body = p.textStyles.find((t) => t.name === 'type/body-md-semibold')
    expect(body.fontName).toEqual({ family: 'Nunito', style: 'Semi Bold' })
    expect(body.fontSize).toBe(14)
    expect(body.lineHeight).toEqual({ unit: 'PIXELS', value: 24 })
    const heading = p.textStyles.find((t) => t.name === 'type/heading-md-semibold')
    expect(heading.fontName).toEqual({ family: 'Raleway', style: 'SemiBold' })
    const alias = Object.values(p.variables.find((x) => x.name === 'body-md-semibold/size')!.valuesByMode)[0] as any
    expect(alias).toEqual({ type: 'VARIABLE_ALIAS', id: p.variables.find((x) => x.name === 'body-md/size')!.id })
    expect(p.textStyles).toHaveLength(13)
  })

  it('skips text styles for fonts Figma does not have, and says which', async () => {
    const i = input()
    i.type.headingFont = 'Fraunces'
    const p = loadPlugin()
    await p.send({ type: 'import', doc: JSON.parse(buildExport(i, 'json', ALL_MODULES).text), groups: ['Type'] })
    expect(p.posted.at(-1).result.missingFonts).toEqual(['Fraunces'])
    expect(p.textStyles).toHaveLength(7)
    expect(p.textStyles.every((t) => t.fontName.family === 'Nunito')).toBe(true)
    expect(p.variables.find((x) => x.name === 'font-family/heading')).toBeDefined()
  })

  it('updates text styles in place on a second import', async () => {
    const p = loadPlugin()
    await p.send({ type: 'import', doc: p.doc, groups: ['Type'] })
    const i = input()
    i.type.bodyFont = 'Inter'
    await p.send({ type: 'import', doc: JSON.parse(buildExport(i, 'json', ALL_MODULES).text), groups: ['Type'] })
    expect(p.textStyles).toHaveLength(11)
    expect(p.textStyles.find((t) => t.name === 'type/body-md').fontName).toEqual({ family: 'Inter', style: 'Regular' })
  })

  it('updates in place when run again, and writes the new values', async () => {
    const p = loadPlugin()
    const groups = ['Primitives', 'Semantic', 'Type', 'Grid', 'Spacing', 'Elevation']
    await p.send({ type: 'import', doc: p.doc, groups })
    const before = p.variables.length
    const i = input()
    i.settings.text.primary = '#0EA5E9'
    i.elevation.tokens[0].layers[0].blur = 9
    await p.send({ type: 'import', doc: JSON.parse(buildExport(i, 'json', ALL_MODULES).text), groups })
    expect(p.variables.length).toBe(before)
    expect(p.styles).toHaveLength(5)
    const second = p.posted.filter((m) => m.type === 'done')[1].result
    expect(second.created).toBe(0)
    expect(second.updated).toBe(before)
    const prim = p.collections.find((c) => c.name === 'Primitives')
    const val = p.variables.find((x) => x.name === 'colour/primary/10').valuesByMode[prim.modes[0].modeId]
    expect(val.b).toBeGreaterThan(0.8)
    expect(p.styles[0].effects[0].radius).toBe(9)
  })

  it('writes shadows as drop shadow effects with every layer', async () => {
    const i = input()
    i.elevation.tokens = [{ name: 'two', layers: [{ x: 1, y: 2, blur: 3, spread: -1, op: 20 }, { x: 0, y: 4, blur: 8, spread: 0, op: 10 }] }]
    const p = loadPlugin()
    await p.send({ type: 'import', doc: JSON.parse(buildExport(i, 'json', ALL_MODULES).text), groups: ['Elevation'] })
    expect(p.styles).toHaveLength(1)
    expect(p.styles[0].name).toBe('elevation/two')
    expect(p.styles[0].effects).toHaveLength(2)
    expect(p.styles[0].effects[0]).toMatchObject({ type: 'DROP_SHADOW', offset: { x: 1, y: 2 }, radius: 3, spread: -1, visible: true })
    expect(p.styles[0].effects[0].color.a).toBeCloseTo(0.2, 2)
    expect(p.collections).toHaveLength(0)
  })

  it('imports only the chosen groups', async () => {
    const p = loadPlugin()
    await p.send({ type: 'import', doc: p.doc, groups: ['Spacing'] })
    expect(p.collections.map((c) => c.name)).toEqual(['Spacing'])
    expect(p.styles).toHaveLength(0)
  })

  it('lets Semantic alias primitives that were imported earlier, and explains when they are missing', async () => {
    const p = loadPlugin()
    await p.send({ type: 'import', doc: p.doc, groups: ['Semantic'] })
    expect(p.posted.at(-1)).toMatchObject({ type: 'error' })
    expect(p.posted.at(-1).message).toContain('Primitives')
    await p.send({ type: 'import', doc: p.doc, groups: ['Primitives'] })
    await p.send({ type: 'import', doc: p.doc, groups: ['Semantic'] })
    expect(p.posted.at(-1)).toMatchObject({ type: 'done' })
    expect(p.variables.filter((v) => v.name.startsWith('colour/bg')).length).toBeGreaterThan(30)
  })

  it('reports readable errors for files that are not Baseline tokens, or nothing selected', async () => {
    const p = loadPlugin()
    await p.send({ type: 'import', doc: { hello: 'world' }, groups: ['Primitives'] })
    expect(p.posted.at(-1).message).toMatch(/Nothing to import/)
    await p.send({ type: 'import', doc: null, groups: ['Primitives'] })
    expect(p.posted.at(-1).message).toMatch(/not a design tokens file/)
    await p.send({ type: 'import', doc: p.doc, groups: [] })
    expect(p.posted.at(-1).message).toMatch(/Nothing to import/)
    expect(p.variables).toHaveLength(0)
  })

  it('ignores unknown messages and closes on cancel', async () => {
    const p = loadPlugin()
    let closed = false
    p.figma.closePlugin = () => { closed = true }
    await p.send({ type: 'other' })
    expect(p.posted).toHaveLength(0)
    await p.send({ type: 'cancel' })
    expect(closed).toBe(true)
  })
})
