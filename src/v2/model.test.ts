import { describe, expect, it } from 'vitest'
import { buildPalettes, defaultSettings } from '../lib/colour'
import { computeGroups, defaultTypeSettings } from '../lib/typeScale'
import { resolveAll } from '../lib/tokens'
import { cssName, slug } from './naming'
import { overrideKey, refOf } from './model'
import { resolveSystem } from './resolve'
import { builtInSystems, defaultSystem, untitledSystem } from './systems'

describe('naming', () => {
  it('turns a path into a CSS custom property', () => {
    const p = { prefix: '--', separator: '-' }
    expect(cssName(p, 'primary/10')).toBe('--primary-10')
    expect(cssName(p, 'Colors/Text/text-primary (900)')).toBe('--colors-text-text-primary-900')
    expect(cssName({ prefix: '--ds-', separator: '_' }, 'Colors/Brand/600')).toBe('--ds-colors_brand_600')
    expect(slug('  A  b ')).toBe('a-b')
  })
})

describe('Default as data', () => {
  const sys = defaultSystem()
  const r = resolveSystem(sys, 'base')
  const prim = r.collections.find((c) => c.name === 'Primitives')!
  const sem = r.collections.find((c) => c.name === 'Semantic')!

  it('has the 16-step ramps and 58 semantic tokens of v1', () => {
    expect(sys.recipes.map((x) => x.id)).toEqual(['primary', 'neutral', 'info', 'success', 'caution', 'warning', 'critical'])
    expect(prim.variables.filter((v) => v.path.startsWith('primary/'))).toHaveLength(16)
    expect(prim.variables).toHaveLength(7 * 16 + 32)
    expect(sem.variables).toHaveLength(58)
    expect(r.collections).toHaveLength(3)
    expect(sem.modes.map((m) => m.name)).toEqual(['Light', 'Dark'])
  })

  it('every ramp colour and every semantic colour equals what v1 resolves', () => {
    const palettes = buildPalettes(defaultSettings())
    for (const p of palettes) p.steps.forEach((h, i) => expect(prim.variables.find((v) => v.path === `${p.key}/${i + 1}`)!.cells.value.value).toBe(`#${h}`))
    const v1 = resolveAll(palettes, {})
    for (const t of v1.tokens) {
      const v = sem.variables.find((x) => x.path === t.def.name)!
      if (t.light.hex) expect(String(v.cells.light.value).slice(0, 7)).toBe(`#${t.light.hex}`)
      if (t.dark.hex) expect(String(v.cells.dark.value).slice(0, 7)).toBe(`#${t.dark.hex}`)
    }
  })

  it('a semantic token is a link, not a copy', () => {
    const fill = sem.variables.find((v) => v.path === 'bg-fill')!
    expect(fill.cells.light.alias).toBe(refOf('Primitives', 'primary/10'))
    expect(fill.group).toBe('bg')
  })
})

describe('Untitled as data', () => {
  const r = resolveSystem(untitledSystem(), 'base')
  const prim = r.collections[0]
  const modes = r.collections[1]

  it('has the ramps and the 273 semantic tokens of the files, named like the files', () => {
    expect(prim.name).toBe('_Primitives')
    expect(prim.variables).toHaveLength(27 * 11 + 2)
    expect(modes.name).toBe('1. Color modes')
    expect(modes.variables).toHaveLength(273)
    expect(modes.modes.map((m) => m.name)).toEqual(['Light mode', 'Dark mode'])
    expect(r.find(refOf('_Primitives', 'Colors/Brand/600'))!.cells.style.value).toBe('#7F56D9')
  })

  it('follows links across collections and modes', () => {
    const t = modes.variables.find((v) => v.path === 'Colors/Text/text-primary (900)')!
    expect(t.cells.light.alias).toBe(refOf('_Primitives', 'Colors/Neutral/900'))
    expect(t.cells.light.value).toBe('#171717')
    expect(t.cells.dark.value).toBe('#FAFAFA')
  })

  it('keeps plain colours that are not links', () => {
    const plain = modes.variables.flatMap((v) => Object.values(v.cells)).filter((c) => c.alias === undefined)
    expect(plain.length).toBe(110)
  })
})

describe('themes', () => {
  it('a ramp colour regenerates the ramp and the tokens that follow it', () => {
    const sys = untitledSystem()
    sys.themes.push({ id: 'sky', name: 'Sky', ramps: { brand: '#0EA5E9' }, overrides: {} })
    const base = resolveSystem(sys, 'base')
    const sky = resolveSystem(sys, 'sky')
    expect(sky.find(refOf('_Primitives', 'Colors/Brand/600'))!.cells.style.value).toBe('#0EA5E9')
    expect(sky.find(refOf('_Primitives', 'Colors/Red/600'))!.cells.style.value).toBe(base.find(refOf('_Primitives', 'Colors/Red/600'))!.cells.style.value)
    const token = (r: typeof base) => r.find(refOf('1. Color modes', 'Colors/Text/text-brand-tertiary (600)'))!.cells.light.value
    expect(token(base)).toBe('#7F56D9')
    expect(token(sky)).toBe('#0EA5E9')
  })

  it('an override replaces one cell without touching the system', () => {
    const sys = defaultSystem()
    sys.themes.push({ id: 'o', name: 'O', ramps: {}, overrides: { [overrideKey('Semantic', 'bg-fill', 'light')]: { alias: refOf('Primitives', 'info/10') } } })
    const r = resolveSystem(sys, 'o')
    const fill = r.find(refOf('Semantic', 'bg-fill'))!
    expect(fill.cells.light).toMatchObject({ alias: refOf('Primitives', 'info/10'), overridden: true })
    expect(fill.cells.light.value).toBe('#2563EB')
    expect(fill.cells.dark.overridden).toBe(false)
    expect(sys.collections[1].variables.find((v) => v.path === 'bg-fill')!.cells.light.alias).toBe(refOf('Primitives', 'primary/10'))
  })

  it('a link to nothing resolves to an empty value instead of throwing', () => {
    const sys = defaultSystem()
    sys.themes.push({ id: 'x', name: 'X', ramps: {}, overrides: { [overrideKey('Semantic', 'bg', 'light')]: { alias: 'Primitives::nope/1' } } })
    expect(resolveSystem(sys, 'x').find(refOf('Semantic', 'bg'))!.cells.light.value).toBe('')
  })

  it('built-in systems are independent copies', () => {
    const [a] = builtInSystems()
    const [b] = builtInSystems()
    a.collections[0].variables.length = 0
    expect(b.collections[0].variables.length).toBeGreaterThan(0)
  })
})

describe('type as data', () => {
  const typeVar = (r: ReturnType<typeof resolveSystem>, c: string, path: string) => r.find(refOf(c, path))!.cells.value.value

  it('Default: a scale of 11 steps from base 14 and ratio 1.125, equal to v1', () => {
    const sys = defaultSystem()
    const r = resolveSystem(sys, 'base')
    expect(sys.type!.steps.map((s) => s.name)).toEqual(['heading-xl', 'heading-lg', 'heading-md', 'heading-sm', 'body-lg', 'body-md', 'body-sm', 'label-lg', 'label-md', 'label-sm', 'label-xs'])
    const v1 = computeGroups({ ...defaultTypeSettings(), tablet: { on: false, pct: 0 }, mobile: { on: false, pct: 0 } }).flatMap((g) => g.rows)
    for (const row of v1) {
      expect(typeVar(r, 'Type', `type/${row.name}/size`)).toBe(row.size)
      expect(typeVar(r, 'Type', `type/${row.name}/line`)).toBe(row.lh)
      expect(typeVar(r, 'Type', `type/${row.name}/track`)).toBe(row.tr)
      expect(typeVar(r, 'Type', `type/${row.name}/weight`)).toBe(row.weight)
    }
    expect(typeVar(r, 'Type', 'type/font/heading')).toBe('Raleway')
    expect(r.find(refOf('Type', 'type/body-md/track'))!.unit).toBe('em')
  })

  it('Untitled: eleven named steps with the sizes of the files, Inter, and the weight names', () => {
    const r = resolveSystem(untitledSystem(), 'base')
    expect(typeVar(r, '6. Typography', 'Font size/text-md')).toBe(16)
    expect(typeVar(r, '6. Typography', 'Line height/text-md')).toBe(24)
    expect(typeVar(r, '6. Typography', 'Font size/display-2xl')).toBe(72)
    expect(typeVar(r, '6. Typography', 'Line height/display-2xl')).toBe(90)
    expect(typeVar(r, '6. Typography', 'Font family/font-family-body')).toBe('Inter')
    expect(typeVar(r, '6. Typography', 'Font weight/semibold')).toBe('Semibold')
    expect(r.collections[2].variables).toHaveLength(32)
  })

  it('a theme changes the scale: base and ratio move every step, fonts change, and nothing else does', () => {
    const sys = defaultSystem()
    sys.themes.push({ id: 't', name: 'T', ramps: {}, overrides: {}, type: { base: 16, ratio: 1.25, headingFont: 'Inter' } })
    const base = resolveSystem(sys, 'base')
    const t = resolveSystem(sys, 't')
    expect(typeVar(t, 'Type', 'type/body-md/size')).toBe(16)
    expect(typeVar(base, 'Type', 'type/body-md/size')).toBe(14)
    expect(Number(typeVar(t, 'Type', 'type/heading-xl/size'))).toBeGreaterThan(Number(typeVar(base, 'Type', 'type/heading-xl/size')))
    expect(typeVar(t, 'Type', 'type/font/heading')).toBe('Inter')
    expect(typeVar(t, 'Type', 'type/font/body')).toBe('Nunito')
    expect(t.find(refOf('Primitives', 'primary/10'))!.cells.value.value).toBe(base.find(refOf('Primitives', 'primary/10'))!.cells.value.value)
  })

  it('a step\'s own size, and in a fixed system its line height follows in proportion', () => {
    const u = untitledSystem()
    u.themes.push({ id: 't', name: 'T', ramps: {}, overrides: {}, type: { steps: { 'text-md': { size: 18 }, 'text-sm': { size: 15, lh: 22 } } } })
    const r = resolveSystem(u, 't')
    expect(typeVar(r, '6. Typography', 'Font size/text-md')).toBe(18)
    expect(typeVar(r, '6. Typography', 'Line height/text-md')).toBe(27)
    expect(typeVar(r, '6. Typography', 'Line height/text-sm')).toBe(22)
    expect(typeVar(r, '6. Typography', 'Font size/text-lg')).toBe(18)
    const d = defaultSystem()
    d.themes.push({ id: 't', name: 'T', ramps: {}, overrides: {}, type: { steps: { 'body-md': { size: 20, lh: 30, tr: 0.02 } } } })
    const rd = resolveSystem(d, 't')
    expect([typeVar(rd, 'Type', 'type/body-md/size'), typeVar(rd, 'Type', 'type/body-md/line'), typeVar(rd, 'Type', 'type/body-md/track')]).toEqual([20, 30, 0.02])
  })
})
