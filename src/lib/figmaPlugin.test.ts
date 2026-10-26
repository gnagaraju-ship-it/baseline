import { describe, expect, it } from 'vitest'
import { defaultSettings } from './colour'
import { defaultElevationSettings } from './elevation'
import type { ExportInput } from './exportAll'
import { ALL_MODULES, buildExport } from './exportBuilder'
import { systemJson } from '../v2/export/json'
import { resolveThemes, themesJson } from '../v2/export/themes'
import { activeResolved, resetV2, useV2 } from '../v2/store'
import { cloneData, defaultThemeData, untitledThemeData, type ThemeData } from './themes'
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
          setValueForMode(m: string, val: any) {
            const alias = val && val.type === 'VARIABLE_ALIAS'
            const ok = alias || (this.resolvedType === 'STRING' ? typeof val === 'string' : this.resolvedType === 'FLOAT' ? typeof val === 'number' : typeof val === 'object')
            if (!ok) throw new Error('Mismatched variable resolved type for mode ' + m)
            this.valuesByMode[m] = val
          },
          remove() { variables.splice(variables.indexOf(this), 1) },
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
    expect(p.collections.map((c) => c.name)).toEqual(['Primitives', 'Semantic', 'Type', 'Responsive', 'Spacing'])
    const count = (name: string) => p.variables.filter((v) => v.variableCollectionId === p.collections.find((c) => c.name === name).id).length
    expect(count('Primitives')).toBe(112 + 32)
    expect(count('Semantic')).toBe(58)
    expect(count('Type')).toBe(2 + 11 * 2)
    expect(count('Responsive')).toBe(11 * 3 + 6 + 12)
    expect(count('Spacing')).toBe(17)
    expect(p.styles.map((s) => s.name)).toEqual(['elevation/xs', 'elevation/sm', 'elevation/md', 'elevation/lg', 'elevation/xl'])
    expect(done.result).toEqual({ created: 144 + 58 + 24 + 51 + 17, updated: 0, styles: 5, textStyles: 11, missingFonts: [], skipped: [], replaced: [], limited: [], themes: [], imported: 0 })
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
    await p.send({ type: 'import', doc: p.doc, groups: ['Primitives', 'Semantic', 'Type', 'Grid', 'Spacing'] })
    const v = (n: string) => p.variables.find((x) => x.name === n)
    expect(v('colour/primary/10').scopes).toEqual([])
    expect(v('colour/primary/10').codeSyntax.WEB).toBe('var(--primary-10)')
    const prim = p.collections.find((c) => c.name === 'Primitives')
    expect(v('colour/primary/10').valuesByMode[prim.modes[0].modeId]).toMatchObject({ a: 1 })
    expect(v('colour/text').scopes).toEqual(['TEXT_FILL'])
    expect(v('colour/border-brand').scopes).toEqual(['STROKE_COLOR'])
    expect(v('colour/bg-fill').scopes).toEqual(['FRAME_FILL', 'SHAPE_FILL'])
    expect(v('type/heading-xl/size').scopes).toEqual(['FONT_SIZE'])
    expect(v('type/heading-xl/size').codeSyntax.WEB).toBe('var(--type-heading-xl-size)')
    expect(v('type/heading-xl/line-height').codeSyntax.WEB).toBe('var(--type-heading-xl-line)')
    expect(v('type/heading-xl/letter-spacing').description).toBe('px = em x font size')
    expect(v('space/24').scopes).toEqual(['GAP'])
    expect(v('space/24').codeSyntax.WEB).toBe('var(--space-24)')
    expect(v('spacing/stack-md').codeSyntax.WEB).toBe('var(--stack-md)')
    expect(v('grid/columns').codeSyntax.WEB).toBe('var(--grid-columns)')
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

  it('stores letter spacing as pixels (em x font size) for each breakpoint, the way Figma reads a bound variable', async () => {
    const p = loadPlugin()
    await p.send({ type: 'import', doc: p.doc, groups: ['Type'] })
    const resp = p.collections.find((c) => c.name === 'Responsive')
    const at = (n: string, mode: string) => p.variables.find((x) => x.name === n)!.valuesByMode[resp.modes.find((m: any) => m.name === mode).modeId] as number
    expect(at('type/heading-xl/letter-spacing', 'XXL')).toBeCloseTo(-0.25, 3)
    expect(at('type/heading-xl/letter-spacing', 'MD')).toBeCloseTo(-0.23, 3)
    expect(at('type/heading-xl/letter-spacing', 'XS')).toBeCloseTo(-0.21, 3)
    expect(at('type/label-xs/letter-spacing', 'XS')).toBeCloseTo(0.1, 3)
    expect(at('type/body-md/letter-spacing', 'MD')).toBe(0)
  })

  it('puts type sizes, grid and spacing in one Responsive collection with a value for XXL, MD and XS', async () => {
    const p = loadPlugin()
    await p.send({ type: 'import', doc: p.doc, groups: ['Type', 'Grid', 'Spacing'] })
    const resp = p.collections.find((c) => c.name === 'Responsive')
    expect(resp.modes.map((m: any) => m.name)).toEqual(['XXL', 'MD', 'XS'])
    const values = (n: string) => resp.modes.map((m: any) => p.variables.find((x) => x.name === n)!.valuesByMode[m.modeId])
    // headings shrink by the Tablet (-8%) and Mobile (-15%) settings, body text does not
    expect(values('type/heading-xl/size')).toEqual([25, 23, 21])
    expect(values('type/heading-xl/line-height')).toEqual([32, 24, 24])
    expect(values('type/body-md/size')).toEqual([14, 14, 14])
    expect(values('grid/width')).toEqual([1400, 768, 390])
    expect(values('grid/columns')).toEqual([12, 8, 4])
    expect(values('grid/gutter')).toEqual([24, 16, 16])
    expect(values('grid/sidebar')).toEqual([272, 72, 0])
    expect(values('spacing/stack-md')).toEqual([16, 16, 12])
    expect(values('spacing/section-y')).toEqual([96, 64, 48])
    // the spacing scale itself and the fonts are single-mode collections
    expect(p.collections.find((c) => c.name === 'Spacing').modes).toHaveLength(1)
    expect(p.collections.find((c) => c.name === 'Type').modes).toHaveLength(1)
    expect(p.variables.find((x) => x.name === 'space/24')!.variableCollectionId).toBe(p.collections.find((c) => c.name === 'Spacing').id)
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
    expect(heading.bound.fontSize).toBe(p.variables.find((x) => x.name === 'type/heading-xl/size').id)
    expect(heading.bound.lineHeight).toBe(p.variables.find((x) => x.name === 'type/heading-xl/line-height').id)
    expect(heading.bound.fontFamily).toBe(p.variables.find((x) => x.name === 'heading-xl/family').id)
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
    const resp = p.collections.find((c) => c.name === 'Responsive')
    const variantSize = p.variables.find((x) => x.name === 'type/body-md-semibold/size')!
    for (const m of resp.modes) expect(variantSize.valuesByMode[m.modeId]).toEqual({ type: 'VARIABLE_ALIAS', id: p.variables.find((x) => x.name === 'type/body-md/size')!.id })
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
    expect(p.collections.map((c) => c.name)).toEqual(['Spacing', 'Responsive'])
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

  it('replaces a variable left with the wrong type by an older import, and says so', async () => {
    const p = loadPlugin()
    await p.send({ type: 'import', doc: p.doc, groups: ['Type'] })
    // simulate an older plugin that made the font family a number variable
    const bad = p.variables.find((v) => v.name === 'font-family/heading')!
    bad.resolvedType = 'FLOAT'
    bad.valuesByMode = {}
    const typeCollectionId = bad.variableCollectionId
    await p.send({ type: 'import', doc: p.doc, groups: ['Type'] })
    expect(p.posted.find((m) => m.type === 'error')).toBeUndefined()
    const result = p.posted.at(-1).result
    expect(result.replaced).toEqual(['font-family/heading'])
    const fixed = p.variables.filter((v) => v.name === 'font-family/heading')
    expect(fixed).toHaveLength(1)
    expect(fixed[0].resolvedType).toBe('STRING')
    expect(fixed[0].variableCollectionId).toBe(typeCollectionId)
    expect(Object.values(fixed[0].valuesByMode)[0]).toBe('Raleway')
    // the steps still point at the new variable
    const alias = Object.values(p.variables.find((v) => v.name === 'heading-xl/family')!.valuesByMode)[0] as any
    expect(alias.id).toBe(fixed[0].id)
    // a clean re-run replaces nothing
    await p.send({ type: 'import', doc: p.doc, groups: ['Type'] })
    expect(p.posted.at(-1).result.replaced).toEqual([])
  })

  it('skips a value that is not a number and names it, instead of failing the whole import', async () => {
    const p = loadPlugin()
    const doc = JSON.parse(JSON.stringify(p.doc))
    doc.Grid.column.$extensions['com.figma'].modes.MD = 'NaNpx'
    doc.Spacing.space['8'].$value = 'abc'
    const size = doc.Type['body-md'].size
    size.$value = 'NaNpx'
    size.$extensions['com.figma'].modes.XXL = 'NaNpx'
    await p.send({ type: 'import', doc, groups: ['Primitives', 'Type', 'Grid', 'Spacing'] })
    expect(p.posted.find((m) => m.type === 'error')).toBeUndefined()
    const done = p.posted.at(-1).result
    expect(done.skipped).toEqual(['Responsive/type/body-md/size ("NaNpx")', 'Responsive/grid/column ("NaNpx")', 'Spacing/space/8 ("abc")'])
    expect(p.variables.find((v) => v.name === 'grid/column')).toBeUndefined()
    expect(p.variables.find((v) => v.name === 'grid/width')).toBeDefined()
    // no variable was ever given NaN
    for (const v of p.variables) for (const val of Object.values(v.valuesByMode)) if (typeof val === 'number') expect(Number.isNaN(val)).toBe(false)
  })

  it('never writes NaN: tracking falls back when a step has no readable size', async () => {
    const p = loadPlugin()
    const doc = JSON.parse(JSON.stringify(p.doc))
    delete doc.Type['heading-xl'].size
    await p.send({ type: 'import', doc, groups: ['Type'] })
    const resp = p.collections.find((c) => c.name === 'Responsive')
    const v = p.variables.find((x) => x.name === 'type/heading-xl/letter-spacing')!
    for (const m of resp.modes) expect(v.valuesByMode[m.modeId]).toBeCloseTo(-0.16, 3)
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

describe('plugin import: themes', () => {
  const GROUPS = ['Primitives', 'Semantic', 'Type', 'Grid', 'Spacing', 'Elevation']
  const themed = (change: (d: ThemeData) => void) => {
    const base = defaultThemeData()
    const other = cloneData(base)
    change(other)
    return JSON.parse(buildExport([{ name: 'Default', data: base }, { name: 'Ocean', data: other }], 'json', ALL_MODULES).text)
  }
  const run = async (doc: any, tweak?: (p: ReturnType<typeof loadPlugin>) => void) => {
    const p = loadPlugin()
    tweak?.(p)
    await p.send({ type: 'import', doc, groups: GROUPS })
    const modes = (name: string) => p.collections.find((c) => c.name === name)?.modes.map((m: any) => m.name)
    const done = p.posted.find((m) => m.type === 'done')
    return { p, modes, done, error: p.posted.find((m) => m.type === 'error') }
  }
  const valueIn = (p: ReturnType<typeof loadPlugin>, collection: string, variable: string, mode: string) => {
    const c = p.collections.find((x) => x.name === collection)
    const v = p.variables.find((x) => x.variableCollectionId === c.id && x.name === variable)
    return v.valuesByMode[c.modes.find((m: any) => m.name === mode).modeId]
  }

  it('gives a mode per theme only where the themes differ', async () => {
    const { modes, done, error, p } = await run(themed((d) => { d.settings.text.primary = '#0EA5E9'; d.grid.columns.xxl = 8 }))
    expect(error).toBeUndefined()
    expect(modes('Primitives')).toEqual(['Default', 'Ocean'])
    expect(modes('Semantic')).toEqual(['Light', 'Dark']) // same remaps: aliases switch through Primitives
    expect(modes('Type')).toEqual(['Value'])
    expect(modes('Spacing')).toEqual(['Value'])
    expect(modes('Responsive')).toEqual(['Default / XXL', 'Default / MD', 'Default / XS', 'Ocean / XXL', 'Ocean / MD', 'Ocean / XS'])
    expect(done.result.themes).toEqual(['Default', 'Ocean'])
    // the primary ramp holds each theme's own colours
    const a = valueIn(p, 'Primitives', 'colour/primary/10', 'Default')
    const b = valueIn(p, 'Primitives', 'colour/primary/10', 'Ocean')
    expect(a).not.toEqual(b)
    // grid columns differ by theme in the Responsive collection
    expect(valueIn(p, 'Responsive', 'grid/columns', 'Default / XXL')).not.toEqual(valueIn(p, 'Responsive', 'grid/columns', 'Ocean / XXL'))
  })

  it('splits Semantic into Theme / Light and Theme / Dark when the themes map tokens differently', async () => {
    const { modes, p } = await run(themed((d) => { d.tokenOverrides['bg|light'] = 'info-10' }))
    expect(modes('Semantic')).toEqual(['Default / Light', 'Default / Dark', 'Ocean / Light', 'Ocean / Dark'])
    expect(modes('Primitives')).toEqual(['Value'])
    const light = (m: string) => valueIn(p, 'Semantic', 'colour/bg', m)
    expect(light('Default / Light')).not.toEqual(light('Ocean / Light'))
    expect(light('Default / Dark')).toEqual(light('Ocean / Dark'))
  })

  it('keeps the normal modes and the same variables when the themes are identical', async () => {
    const same = await run(themed(() => {}))
    const one = await run(loadPlugin().doc)
    for (const c of ['Primitives', 'Semantic', 'Type', 'Responsive', 'Spacing']) expect(same.modes(c)).toEqual(one.modes(c))
    expect(same.done.result).toMatchObject({ created: one.done.result.created, styles: 5 })
    expect(same.p.styles.map((x) => x.name)).toEqual(one.p.styles.map((x) => x.name))
  })

  it('names type and spacing modes after the themes when fonts or spacing differ', async () => {
    const { modes } = await run(themed((d) => { d.type.headingFont = 'Nunito'; d.spacing.base = 'b8'; d.spacing.on = { ...d.spacing.on, 12: false } }))
    expect(modes('Type')).toEqual(['Default', 'Ocean'])
    expect(modes('Spacing')).toEqual(['Default', 'Ocean'])
  })

  it('makes elevation styles per theme only when the shadows differ', async () => {
    const { p } = await run(themed((d) => { d.elevation.tokens[0].layers[0].blur = 40 }))
    expect(p.styles.map((x) => x.name)).toEqual(
      ['xs', 'sm', 'md', 'lg', 'xl'].map((n) => `elevation/Default/${n}`).concat(['xs', 'sm', 'md', 'lg', 'xl'].map((n) => `elevation/Ocean/${n}`))
    )
  })

  it('reports a collection that needs more modes than the plan allows, and still imports the rest', async () => {
    const limit = (pl: ReturnType<typeof loadPlugin>) => {
      const make = pl.figma.variables.createVariableCollection
      pl.figma.variables.createVariableCollection = (name: string) => {
        const c = make(name)
        const add = c.addMode.bind(c)
        c.addMode = (n: string) => { if (c.modes.length >= 2) throw new Error('Limited to 2 modes on this plan'); add(n) }
        return c
      }
    }
    const tight = await run(themed((d) => { d.tokenOverrides['bg|light'] = 'info-10'; d.grid.columns.xxl = 8 }), limit)
    expect(tight.error).toBeUndefined()
    expect(tight.done.result.limited.map((x: string) => x.split(' needs')[0]).sort()).toEqual(['Responsive', 'Semantic'])
    expect(tight.done.result.limited[0]).toMatch(/needs \d+ modes/)
    expect(tight.p.collections.map((c: any) => c.name)).toEqual(expect.arrayContaining(['Primitives', 'Type', 'Spacing']))
    expect(tight.p.variables.some((v: any) => v.name === 'colour/primary/10')).toBe(true)
  })
})

describe('plugin import: Untitled (colour schema and imported collections)', () => {
  const GROUPS = ['Primitives', 'Semantic', 'Type', 'Grid', 'Spacing', 'Elevation', 'Imported']
  const doc = () => JSON.parse(buildExport([{ name: 'Default', data: defaultThemeData() }, { name: 'Untitled', data: untitledThemeData() }], 'json', ALL_MODULES).text)
  const col = (p: ReturnType<typeof loadPlugin>, name: string) => p.collections.find((c) => c.name === name)
  const vars = (p: ReturnType<typeof loadPlugin>, name: string) => p.variables.filter((v) => v.variableCollectionId === col(p, name).id)

  it('creates the collections with their own names and modes, and leaves the generated ones with normal modes', async () => {
    const p = loadPlugin()
    await p.send({ type: 'import', doc: doc(), groups: GROUPS })
    expect(p.posted.find((m) => m.type === 'error')).toBeUndefined()
    const done = p.posted.find((m) => m.type === 'done').result
    expect(done.imported).toBe(7)
    expect(done.limited).toEqual([])
    expect(col(p, 'Primitives').modes.map((m: any) => m.name)).toEqual(['Value']) // one generated theme: no theme modes
    expect(col(p, '1. Color modes').modes.map((m: any) => m.name)).toEqual(['Light mode', 'Dark mode'])
    expect(vars(p, '_Primitives')).toHaveLength(27 * 11 + 2 + 32)
    expect(vars(p, '1. Color modes')).toHaveLength(273)
    expect(vars(p, '6. Typography')).toHaveLength(32)
    expect(vars(p, '2. Radius')).toHaveLength(11)
    expect(p.collections.some((c) => c.name === 'Brand palette')).toBe(false)
  })

  it('keeps aliases between collections and the values of every mode', async () => {
    const p = loadPlugin()
    await p.send({ type: 'import', doc: doc(), groups: GROUPS })
    const bg = vars(p, '1. Color modes').find((v) => v.name === 'Colors/Background/bg-primary')
    const modes = col(p, '1. Color modes').modes
    const white = vars(p, '_Primitives').find((v) => v.name === 'Colors/Base/white')
    expect(bg.valuesByMode[modes[0].modeId]).toEqual({ type: 'VARIABLE_ALIAS', id: white.id })
    expect(bg.valuesByMode[modes[1].modeId].type).toBe('VARIABLE_ALIAS')
    const brand = vars(p, '_Primitives').find((v) => v.name === 'Colors/Brand/600')
    expect((Object.values(brand.valuesByMode)[0] as any).r).toBeCloseTo(0x7f / 255, 3)
    const size = vars(p, '6. Typography').find((v) => v.name === 'Font size/text-md')
    expect(Object.values(size.valuesByMode)).toEqual([16])
    const family = vars(p, '6. Typography').find((v) => v.name === 'Font family/font-family-body')
    expect(Object.values(family.valuesByMode)).toEqual(['Inter'])
  })

  it('does nothing for imported tokens unless the group is chosen, and updates in place on a second run', async () => {
    const p = loadPlugin()
    await p.send({ type: 'import', doc: doc(), groups: ['Primitives'] })
    expect(col(p, '_Primitives')).toBeUndefined()
    await p.send({ type: 'import', doc: doc(), groups: GROUPS })
    const before = p.variables.length
    await p.send({ type: 'import', doc: doc(), groups: GROUPS })
    expect(p.variables.length).toBe(before)
    expect(p.posted.filter((m) => m.type === 'done').pop().result.created).toBe(0)
  })

  it('reports a collection that needs more modes than the plan allows, and imports the rest', async () => {
    const p = loadPlugin()
    const make = p.figma.variables.createVariableCollection
    p.figma.variables.createVariableCollection = (name: string) => {
      const c = make(name)
      const add = c.addMode.bind(c)
      c.addMode = (n: string) => { if (c.modes.length >= 1) throw new Error('Limited to 1 mode'); add(n) }
      return c
    }
    await p.send({ type: 'import', doc: doc(), groups: GROUPS })
    const done = p.posted.find((m) => m.type === 'done').result
    expect(done.limited.some((x: string) => x.startsWith('1. Color modes needs 2 modes'))).toBe(true)
    expect(vars(p, '6. Typography')).toHaveLength(32)
  })

  it('the plugin window lists Imported tokens for a multi-theme file', async () => {
    const html = file('ui.html')
    document.body.innerHTML = /<body[^>]*>([\s\S]*?)<script>/.exec(html)![1]
    new Function(/<script>([\s\S]*)<\/script>/.exec(html)![1])()
    const paste = document.getElementById('paste') as HTMLTextAreaElement
    paste.value = JSON.stringify(doc())
    paste.dispatchEvent(new Event('input'))
    const labels = [...document.querySelectorAll('#groups label')].map((l) => l.textContent)
    expect(labels.some((t) => t!.startsWith('Imported tokens'))).toBe(true)
    expect(labels.some((t) => t!.startsWith('Colour ramps'))).toBe(true)
  })

  it('the plugin window says what is in a file it cannot use, and which version it is', () => {
    const html = file('ui.html')
    document.body.innerHTML = /<body[^>]*>([\s\S]*?)<script>/.exec(html)![1]
    new Function(/<script>([\s\S]*)<\/script>/.exec(html)![1])()
    expect(document.getElementById('version')!.textContent).toBe('plugin v5')
    const paste = document.getElementById('paste') as HTMLTextAreaElement
    paste.value = JSON.stringify({ Colours: { a: { $value: '#fff' } }, Sizes: {} })
    paste.dispatchEvent(new Event('input'))
    const msg = document.getElementById('status')!.textContent!
    expect(msg).toContain('plugin v5 knows: Primitives, Semantic')
    expect(msg).toContain('This file has: Colours, Sizes')
  })
})

describe('plugin import: a v2 export', () => {
  it('creates the collections of the active v2 system, with modes and links', async () => {
    resetV2()
    useV2.getState().setSystem('untitled')
    const p = loadPlugin()
    await p.send({ type: 'import', doc: JSON.parse(systemJson(activeResolved(useV2.getState()))), groups: ['Imported'] })
    expect(p.posted.find((m) => m.type === 'error')).toBeUndefined()
    expect(p.collections.map((c: any) => c.name)).toEqual(['_Primitives', '1. Color modes', '6. Typography', '4. Widths', '5. Containers', '2. Radius', '3. Spacing'])
    expect(p.collections[1].modes.map((m: any) => m.name)).toEqual(['Light mode', 'Dark mode'])
    const tokens = p.variables.filter((v: any) => v.variableCollectionId === p.collections[1].id)
    expect(tokens).toHaveLength(273)
    expect(tokens.find((v: any) => v.name === 'Colors/Text/text-primary (900)').valuesByMode[p.collections[1].modes[0].modeId].type).toBe('VARIABLE_ALIAS')
    resetV2()
  })

  it('creates a mode per theme where the themes differ, and keeps the others as they are', async () => {
    resetV2()
    const v2 = useV2.getState()
    v2.setSystem('untitled')
    v2.addTheme('Sky')
    v2.setRamp('brand', '#0EA5E9')
    const p = loadPlugin()
    await p.send({ type: 'import', doc: JSON.parse(themesJson(resolveThemes(activeResolved(useV2.getState()).system))), groups: ['Imported'] })
    expect(p.posted.find((m) => m.type === 'error')).toBeUndefined()
    const col = (n: string) => p.collections.find((c: any) => c.name === n)
    expect(col('_Primitives').modes.map((m: any) => m.name)).toEqual(['Base', 'Sky'])
    expect(col('1. Color modes').modes.map((m: any) => m.name)).toEqual(['Light mode', 'Dark mode'])
    const brand = p.variables.find((v: any) => v.variableCollectionId === col('_Primitives').id && v.name === 'Colors/Brand/600')
    const [base, sky] = col('_Primitives').modes.map((m: any) => brand.valuesByMode[m.modeId])
    expect(base.r).toBeCloseTo(0x7f / 255, 3)
    expect(sky.r).toBeCloseTo(0x0e / 255, 3)
    expect(sky.g).toBeCloseTo(0xa5 / 255, 3)
    // the tokens still point at the ramp, so they follow whichever mode a frame uses
    const token = p.variables.find((v: any) => v.variableCollectionId === col('1. Color modes').id && v.name === 'Colors/Background/bg-brand-primary')
    expect(token.valuesByMode[col('1. Color modes').modes[0].modeId].type).toBe('VARIABLE_ALIAS')
    resetV2()
  })

  it('creates Default\'s two collections too', async () => {
    resetV2()
    const p = loadPlugin()
    await p.send({ type: 'import', doc: JSON.parse(systemJson(activeResolved(useV2.getState()))), groups: ['Imported'] })
    expect(p.collections.map((c: any) => [c.name, c.modes.map((m: any) => m.name)])).toEqual([['Primitives', ['Value']], ['Semantic', ['Light', 'Dark']], ['Type', ['Value']], ['Spacing', ['Value']], ['Grid', ['XXL', 'MD', 'XS']]])
    expect(p.variables).toHaveLength(7 * 16 + 32 + 58 + 46 + 17 + 5)
  })
})
