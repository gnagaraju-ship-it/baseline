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
    expect(done.result).toEqual({ created: 144 + 58 + 24 + 51 + 17, updated: 0, styles: 5, textStyles: 11, missingFonts: [], skipped: [], replaced: [] })
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
