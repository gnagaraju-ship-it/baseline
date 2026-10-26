import { describe, expect, it } from 'vitest'
import { gen, tokenRows, type Palette } from './colour'
import { DEFAULT_SCHEMA, parseRef, refLabel, resolveAll, toTokenCss, type TokenDef, type TokenSchema } from './tokens'

const STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']

const schema: TokenSchema = {
  steps: STEPS,
  alpha: [0.1, 0.2, 0.3],
  defs: [
    { name: 'text-primary', group: 'text', kind: 't', light: 'neutral-900', dark: 'neutral-50' },
    { name: 'bg-fill', group: 'bg', kind: 'f', light: 'brand-600', dark: 'brand-500' },
    { name: 'bg-disabled', group: 'bg', kind: 'a', light: 'blackA-2', dark: 'whiteA-2' }
  ] as TokenDef[],
  groups: [{ key: 'text', title: 'Text' }],
  anchors: { neutral: 'neutral', primary: 'brand', text: 10, fill: { light: 6, dark: 5 }, page: { light: 0, dark: 9 } }
}

const palette = (key: string, base: number, hex: string): Palette => ({ key: key as never, name: key, group: 'brand', base, hex, steps: gen(hex, base, 11), alpha: 100 })

describe('ramps of any length', () => {
  it('generates an 11-step ramp with the base colour exactly at the base step', () => {
    const steps = gen('7F56D9', 7, 11)
    expect(steps).toHaveLength(11)
    expect(steps[6]).toBe('7F56D9')
    // lighter before the base, darker after it
    const lum = (h: string) => parseInt(h.slice(0, 2), 16) + parseInt(h.slice(2, 4), 16) + parseInt(h.slice(4, 6), 16)
    expect(lum(steps[0])).toBeGreaterThan(lum(steps[6]))
    expect(lum(steps[10])).toBeLessThan(lum(steps[6]))
  })
  it('16 steps stays the default', () => {
    expect(gen('9D00D6', 10)).toEqual(gen('9D00D6', 10, 16))
    expect(gen('9D00D6', 10)).toHaveLength(16)
  })
  it('names ramp variables with the schema step labels', () => {
    expect(tokenRows([palette('brand', 7, '7F56D9')], STEPS).map((r) => r.name).slice(0, 3)).toEqual(['--brand-50', '--brand-100', '--brand-200'])
    expect(tokenRows([palette('brand', 7, '7F56D9')]).map((r) => r.name)[0]).toBe('--brand-1')
  })
})

describe('tokens of any schema', () => {
  it('reads refs by the schema step labels', () => {
    expect(parseRef('brand-600', STEPS)).toEqual({ palette: 'brand', step: 7 })
    expect(parseRef('brand-12', STEPS).step).toBeNaN()
    expect(parseRef('neutral-3')).toEqual({ palette: 'neutral', step: 3 })
    expect(refLabel('brand-600', STEPS)).toBe('brand-600')
    expect(refLabel('blackA-2', STEPS)).toBe('black-alpha-2')
  })

  it('resolves and writes a schema with its own tokens, steps and alphas', () => {
    const palettes = [palette('neutral', 6, '737373'), palette('brand', 7, '7F56D9')]
    const set = resolveAll(palettes, {}, {}, schema)
    expect(set.tokens.map((t) => t.def.name)).toEqual(['text-primary', 'bg-fill', 'bg-disabled'])
    expect(set.resolvedCount).toBe(3)
    expect(set.tokens[1].light).toMatchObject({ label: 'brand-600', index: 6, hex: '7F56D9' })
    expect(set.tokens[1].light.lc).not.toBeNull()
    const css = toTokenCss(set.tokens, schema)
    expect(css).toContain('--bg-fill: var(--brand-600);')
    expect(css).toContain('--bg-fill: var(--brand-500);')
    expect(css).toContain('--bg-disabled: rgb(0 0 0 / 0.2);')
    expect(css).toContain('--bg-disabled: rgb(255 255 255 / 0.2);')
  })

  it('a ref to a step the schema does not have is unavailable, not a crash', () => {
    const bad = { ...schema, defs: [{ name: 'x', group: 'bg', kind: 's', light: 'brand-12', dark: 'brand-50' }] as TokenDef[] }
    const set = resolveAll([palette('brand', 7, '7F56D9')], {}, {}, bad)
    expect(set.resolvedCount).toBe(0)
    expect(set.tokens[0].light.available).toBe(false)
  })

  it('the default schema is today\'s: 16 steps, 58 tokens', () => {
    expect(DEFAULT_SCHEMA.steps).toHaveLength(16)
    expect(DEFAULT_SCHEMA.defs).toHaveLength(58)
    expect(DEFAULT_SCHEMA.alpha).toHaveLength(16)
  })
})
