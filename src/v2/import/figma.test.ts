import { beforeEach, describe, expect, it } from 'vitest'
import { systemCss } from '../export/css'
import { refOf } from '../model'
import { resolveSystem } from '../resolve'
import { activeResolved, resetV2, useV2 } from '../store'
import { ImportError, inferSystem, parseFigmaFile, type FigmaCollection, type FigmaVariable } from './figma'

let n = 0
const rgb = (hex: string) => ({ r: parseInt(hex.slice(1, 3), 16) / 255, g: parseInt(hex.slice(3, 5), 16) / 255, b: parseInt(hex.slice(5, 7), 16) / 255, a: 1 })
const id = () => `V:${++n}`

function collection(name: string, modes: string[], vars: Array<{ name: string; type: string; values: unknown[]; ids?: Array<string | null> }>): FigmaCollection & { ids: Record<string, string> } {
  const modeIds = modes.map((_, i) => `M${n}:${i}`)
  const ids: Record<string, string> = {}
  return {
    id: `C:${++n}`,
    name,
    modes: Object.fromEntries(modeIds.map((m, i) => [m, modes[i]])),
    variables: vars.map((v): FigmaVariable => {
      const vid = id()
      ids[v.name] = vid
      return { id: vid, name: v.name, type: v.type, resolvedValuesByMode: Object.fromEntries(modeIds.map((m, i) => [m, { resolvedValue: v.type === 'COLOR' && typeof v.values[i] === 'string' ? rgb(v.values[i] as string) : v.values[i], alias: v.ids?.[i] ?? null }])) }
    }),
    ids
  }
}

const STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
const ramp = (family: string, from: string) => STEPS.map((s, i) => ({ name: `Colors/${family}/${s}`, type: 'COLOR', values: [`#${(0x100000 * (i + 1) + parseInt(from, 16)).toString(16).slice(-6).padStart(6, '0')}`] }))

function fixture() {
  const prim = collection('_Primitives', ['Style'], [
    ...ramp('Brand', '000010'), ...ramp('Gray', '101010'),
    { name: 'Colors/Base/white', type: 'COLOR', values: ['#FFFFFF'] }, { name: 'Colors/Base/black', type: 'COLOR', values: ['#000000'] },
    { name: 'Spacing/1 (4px)', type: 'FLOAT', values: [4] }, { name: 'Spacing/2 (8px)', type: 'FLOAT', values: [8] }, { name: 'Spacing/3 (12px)', type: 'FLOAT', values: [12] }, { name: 'Spacing/4 (16px)', type: 'FLOAT', values: [16] }
  ])
  const modes = collection('Color modes', ['Light mode', 'Dark mode'], [
    { name: 'Colors/Text/text-primary', type: 'COLOR', values: ['#171717', '#FAFAFA'], ids: [prim.ids['Colors/Gray/900'], prim.ids['Colors/Gray/50']] },
    { name: 'Colors/Border/border-primary', type: 'COLOR', values: ['#D4D4D4', '#404040'], ids: [prim.ids['Colors/Gray/300'], prim.ids['Colors/Gray/700']] },
    { name: 'Colors/Background/bg-brand', type: 'COLOR', values: ['#7F56D9', '#7F56D9'], ids: [prim.ids['Colors/Brand/600'], prim.ids['Colors/Brand/600']] }
  ])
  const typo = collection('Typography', ['Value'], [
    { name: 'Font family/font-family-display', type: 'STRING', values: ['Inter'] },
    { name: 'Font family/font-family-body', type: 'STRING', values: ['Inter'] },
    { name: 'Font weight/regular', type: 'STRING', values: ['Regular'] },
    { name: 'Font size/text-sm', type: 'FLOAT', values: [14] }, { name: 'Font size/text-md', type: 'FLOAT', values: [16] }, { name: 'Font size/display-lg', type: 'FLOAT', values: [48] },
    { name: 'Line height/text-sm', type: 'FLOAT', values: [20] }, { name: 'Line height/text-md', type: 'FLOAT', values: [24] }, { name: 'Line height/display-lg', type: 'FLOAT', values: [60] }
  ])
  const radius = collection('Radius', ['Mode 1'], [{ name: 'radius-sm', type: 'FLOAT', values: [6] }, { name: 'radius-md', type: 'FLOAT', values: [8] }])
  const spacing = collection('Spacing', ['Mode 1'], [
    { name: 'spacing-xs', type: 'FLOAT', values: [4], ids: [prim.ids['Spacing/1 (4px)']] },
    { name: 'spacing-sm', type: 'FLOAT', values: [8], ids: [prim.ids['Spacing/2 (8px)']] },
    { name: 'spacing-md', type: 'FLOAT', values: [12], ids: [prim.ids['Spacing/3 (12px)']] }
  ])
  return [prim, modes, typo, radius, spacing]
}

describe('reading Figma variable files', () => {
  it('rejects text that is not a collection', () => {
    expect(() => parseFigmaFile('nope', 'a.json')).toThrow('a.json is not valid JSON.')
    expect(() => parseFigmaFile('{"a":1}', 'b.json')).toThrow(/not a Figma variable collection/)
    expect(() => parseFigmaFile('[]', 'c.json')).toThrow(ImportError)
    expect(parseFigmaFile(JSON.stringify(fixture()[0]), 'ok.json').name).toBe('_Primitives')
  })

  it('works out what each collection is for', () => {
    const { report, system } = inferSystem(fixture(), 'Test')
    expect(Object.fromEntries(report.collections.map((c) => [c.name, c.kind]))).toEqual({ _Primitives: 'ramp', 'Color modes': 'semantic', Typography: 'type', Radius: 'dimension', Spacing: 'dimension' })
    expect(report.ramps).toBe(2)
    expect(report.type).toEqual({ steps: 3 })
    expect(system.id).toBe('imported-test')
  })

  it('finds ramps with their steps, base colour and group', () => {
    const { system } = inferSystem(fixture(), 'Test')
    const brand = system.recipes.find((r) => r.name === 'Brand')!
    expect(brand).toMatchObject({ family: 'Colors/Brand', collection: '_Primitives', base: 7, group: 'brand' })
    expect(brand.steps).toEqual(STEPS)
    expect(brand.start).toHaveLength(11)
    expect(system.recipes.find((r) => r.name === 'Gray')!.group).toBe('neutral')
    // white and black are too few to be a ramp
    expect(system.recipes.some((r) => r.name === 'Base')).toBe(false)
  })

  it('keeps links between collections, groups semantic tokens by their path, and keeps modes', () => {
    const { system } = inferSystem(fixture(), 'Test')
    const modes = system.collections.find((c) => c.name === 'Color modes')!
    expect(modes.modes.map((m) => [m.id, m.name])).toEqual([['light-mode', 'Light mode'], ['dark-mode', 'Dark mode']])
    const token = modes.variables.find((v) => v.path === 'Colors/Text/text-primary')!
    expect(token.cells['light-mode'].alias).toBe(refOf('_Primitives', 'Colors/Gray/900'))
    expect(token).toMatchObject({ group: 'Text', kind: 't' })
    expect(modes.variables.find((v) => v.path === 'Colors/Border/border-primary')).toMatchObject({ group: 'Border', kind: 'b' })
  })

  it('sets up type from font sizes, line heights and families', () => {
    const { system } = inferSystem(fixture(), 'Test')
    expect(system.type).toMatchObject({ collection: 'Typography', kind: 'fixed', headingFont: 'Inter', bodyFont: 'Inter' })
    expect(system.type!.steps.map((s) => [s.name, s.group, s.font, s.size, s.lh])).toEqual([['text-sm', 'TEXT', 'body', 14, 20], ['text-md', 'TEXT', 'body', 16, 24], ['display-lg', 'DISPLAY', 'heading', 48, 60]])
    expect(system.type!.paths).toMatchObject({ size: 'Font size/{step}', line: 'Line height/{step}', headingFont: 'Font family/font-family-display' })
  })

  it('lists sizes as sections, with the ones that follow another', () => {
    const { system } = inferSystem(fixture(), 'Test')
    const d = system.dimensions!
    expect(d.map((x) => [x.title, x.shape, x.follows ?? null])).toEqual([
      ['Spacing scale', 'bar', null], ['Radius', 'radius', null], ['Spacing', 'bar', d[0].id]
    ])
    expect(d[0]).toMatchObject({ collection: '_Primitives', prefix: 'Spacing/', addPath: 'Spacing/custom ({n}px)' })
  })

  it('does not take groups of named tokens, or collections with several modes, for ramps', () => {
    const [prim] = fixture()
    const names = collection('Names', ['Value'], Array.from({ length: 8 }, (_, i) => ({ name: `Colors/Text/text-${i}`, type: 'COLOR', values: ['#111111'], ids: [prim.ids['Colors/Gray/900']] })))
    const many = collection('Brand modes', ['Blue', 'Purple'], STEPS.map((x) => ({ name: `Brand/${x}`, type: 'COLOR', values: ['#111111', '#222222'], ids: [prim.ids[`Colors/Brand/${x}`], prim.ids[`Colors/Brand/${x}`]] })))
    const { system, report } = inferSystem([prim, names, many], 'T')
    expect(report.ramps).toBe(2) // only Brand and Gray of the primitives
    expect(system.collections.find((c) => c.name === 'Names')!.kind).toBe('semantic')
    expect(system.collections.find((c) => c.name === 'Brand modes')!.kind).toBe('semantic')
  })

  it('says so when nothing can be used, instead of building an empty system', () => {
    expect(() => inferSystem([], 'X')).toThrow('Choose at least one file.')
    const a = fixture()[3]
    expect(() => inferSystem([a, a], 'X')).toThrow('Two of the files are the same collection.')
    const { report } = inferSystem([fixture()[3]], 'Only radius')
    expect(report.ramps).toBe(0)
    expect(report.type).toBeNull()
  })
})

describe('an imported system works like the built-in ones', () => {
  beforeEach(() => { localStorage.clear(); resetV2() })

  it('resolves, exports with the names of its files, and follows themes', () => {
    const { system } = inferSystem(fixture(), 'Test')
    const r = resolveSystem(system, 'base')
    const css = systemCss(r).css
    expect(css).toContain('--colors-brand-600:')
    expect(css).toContain('--colors-text-text-primary: var(--colors-gray-900);')
    expect(css).toContain('[data-theme="dark"] {')
    expect(css).toContain('--font-size-text-md: 16px;')
    expect(css).toContain('--spacing-xs: var(--spacing-1-4px);')
    system.themes.push({ id: 't', name: 'T', ramps: { 'primitives-colors-brand': '#0EA5E9' }, overrides: {}, type: { steps: { 'text-md': { size: 20 } } } })
    const t = resolveSystem(system, 't')
    expect(t.find(refOf('_Primitives', 'Colors/Brand/600'))!.cells.style.value).toBe('#0EA5E9')
    expect(t.find(refOf('Color modes', 'Colors/Background/bg-brand'))!.cells['light-mode'].value).toBe('#0EA5E9')
    expect(t.find(refOf('Typography', 'Font size/text-md'))!.cells.value.value).toBe(20)
    expect(t.find(refOf('Typography', 'Line height/text-md'))!.cells.value.value).toBe(30)
  })

  it('is added to the store, edited on its own, saved, restored and removed', async () => {
    const { system } = inferSystem(fixture(), 'Test')
    useV2.getState().addSystem(system)
    expect(useV2.getState().activeSystemId).toBe('imported-test')
    useV2.getState().setRamp('primitives-colors-brand', '#0EA5E9')
    expect(activeResolved(useV2.getState()).find(refOf('_Primitives', 'Colors/Brand/600'))!.cells.style.value).toBe('#0EA5E9')
    // the built-in systems are untouched
    useV2.getState().setSystem('untitled')
    expect(activeResolved(useV2.getState()).find(refOf('_Primitives', 'Colors/Brand/600'))!.cells.style.value).toBe('#7F56D9')
    // a second import with the same name gets its own id and name
    useV2.getState().addSystem(inferSystem(fixture(), 'Test').system)
    expect(useV2.getState().custom.map((x) => [x.id, x.name])).toEqual([['imported-test', 'Test'], ['imported-test-2', 'Test 2']])
    // saved and restored
    useV2.getState().setSystem('imported-test')
    const raw = localStorage.getItem('baseline-v2')!
    resetV2()
    expect(useV2.getState().custom).toHaveLength(0)
    localStorage.setItem('baseline-v2', raw)
    await useV2.persist.rehydrate()
    expect(useV2.getState().custom).toHaveLength(2)
    expect(activeResolved(useV2.getState()).find(refOf('_Primitives', 'Colors/Brand/600'))!.cells.style.value).toBe('#0EA5E9')
    useV2.getState().removeSystem('imported-test')
    expect(useV2.getState().custom.map((x) => x.id)).toEqual(['imported-test-2'])
    expect(useV2.getState().activeSystemId).toBe('default')
    useV2.getState().removeSystem('default') // a built-in system cannot be removed
    expect(useV2.getState().activeSystemId).toBe('default')
  })
})
