import { describe, expect, it } from 'vitest'
import {
  DEFAULT_HEX,
  EXACT,
  STEP_COUNT,
  buildPalettes,
  defaultSettings,
  gen,
  hex,
  mix,
  neutralMini,
  norm,
  rgb,
  toCss,
  tokenRows
} from './colour'
import { luminance } from './contrast'

describe('hex helpers', () => {
  it('normalises valid hex with or without #, any case', () => {
    expect(norm('#9d00d6')).toBe('9D00D6')
    expect(norm('9D00D6')).toBe('9D00D6')
    expect(norm('  #abcdef ')).toBe('ABCDEF')
  })
  it('rejects anything that is not six hex digits', () => {
    expect(norm('#fff')).toBeNull()
    expect(norm('zzzzzz')).toBeNull()
    expect(norm('')).toBeNull()
    expect(norm(null)).toBeNull()
    expect(norm('#9d00d6ff')).toBeNull()
  })
  it('round-trips rgb and hex', () => {
    expect(rgb('9D00D6')).toEqual([157, 0, 214])
    expect(hex([157, 0, 214])).toBe('9D00D6')
    expect(hex([300, -4, 15.6])).toBe('FF0010')
  })
  it('mixes toward white and black', () => {
    expect(mix('000000', 255, 1)).toBe('FFFFFF')
    expect(mix('FFFFFF', 0, 1)).toBe('000000')
    expect(mix('336699', 255, 0)).toBe('336699')
  })
})

describe('gen (16-step ramp)', () => {
  const samples: Array<[string, number]> = [
    ['1F9D55', 9],
    ['EAB308', 9],
    ['F97316', 9],
    ['DC2626', 9],
    ['4852E5', 10]
  ]
  it.each(samples)('%s: 16 steps with the base step equal to the input', (colour, base) => {
    const ramp = gen(colour, base)
    expect(ramp).toHaveLength(STEP_COUNT)
    expect(ramp[base - 1]).toBe(colour)
    ramp.forEach((h) => expect(h).toMatch(/^[0-9A-F]{6}$/))
  })
  it.each(samples)('%s: lightness never increases from step 1 to 16', (colour, base) => {
    const lums = gen(colour, base).map(luminance)
    for (let i = 1; i < lums.length; i++) expect(lums[i]).toBeLessThanOrEqual(lums[i - 1] + 1e-9)
  })
})

describe('EXACT ramps', () => {
  it('have 16 steps and the documented base step', () => {
    expect(EXACT.primary).toHaveLength(16)
    expect(EXACT.primary[9]).toBe(DEFAULT_HEX.primary)
    expect(EXACT.info[9]).toBe(DEFAULT_HEX.info)
    expect(EXACT.neutral[8]).toBe('606876')
  })
})

describe('buildPalettes', () => {
  it('returns seven 16-step palettes (112 colours) by default', () => {
    const p = buildPalettes(defaultSettings())
    expect(p.map((x) => x.key)).toEqual(['primary', 'neutral', 'info', 'success', 'caution', 'warning', 'critical'])
    expect(p.every((x) => x.steps.length === 16)).toBe(true)
    expect(p.reduce((n, x) => n + x.steps.length, 0)).toBe(112)
  })
  it('uses the exact ramps for the default Primary, Gray neutral and Info', () => {
    const p = buildPalettes(defaultSettings())
    expect(p[0].steps).toEqual([...EXACT.primary])
    expect(p[1].steps).toEqual([...EXACT.neutral])
    expect(p[2].steps).toEqual([...EXACT.info])
  })
  it('generates a ramp when the primary differs from the default', () => {
    const s = defaultSettings()
    s.text.primary = '#0EA5E9'
    const primary = buildPalettes(s)[0]
    expect(primary.hex).toBe('0EA5E9')
    expect(primary.steps[9]).toBe('0EA5E9')
    expect(primary.steps).not.toEqual([...EXACT.primary])
  })
  it('falls back to the default colour for invalid text', () => {
    const s = defaultSettings()
    s.text.success = 'nope'
    expect(buildPalettes(s).find((x) => x.key === 'success')?.hex).toBe(DEFAULT_HEX.success)
  })
  it('switches neutral presets and generates non-gray ramps around the preset base', () => {
    const s = defaultSettings()
    s.neutral.preset = 'slate'
    const n = buildPalettes(s).find((x) => x.key === 'neutral')!
    expect(n.hex).toBe('64748B')
    expect(n.steps[8]).toBe('64748B')
  })
  it('hides neutral and semantic palettes when removed', () => {
    const s = defaultSettings()
    s.neutral.enabled = false
    expect(buildPalettes(s)).toHaveLength(6)
    s.semanticEnabled = false
    expect(buildPalettes(s).map((x) => x.key)).toEqual(['primary'])
  })
  it('adds one secondary palette (8 x 16 = 128)', () => {
    const s = defaultSettings()
    s.secondary = '#4852E5'
    const p = buildPalettes(s)
    expect(p).toHaveLength(8)
    expect(p[1].key).toBe('secondary')
    expect(p.reduce((n, x) => n + x.steps.length, 0)).toBe(128)
  })
})

describe('css tokens', () => {
  it('emits one custom property per step', () => {
    const rows = tokenRows(buildPalettes(defaultSettings()))
    expect(rows).toHaveLength(112)
    expect(rows[0]).toEqual({ name: '--primary-1', hex: 'FBF4FF' })
    expect(rows[9]).toEqual({ name: '--primary-10', hex: '9D00D6' })
    const css = toCss(rows)
    expect(css.startsWith(':root {\n  --primary-1: #FBF4FF;')).toBe(true)
    expect(css.trimEnd().endsWith('}')).toBe(true)
    expect(css.split('\n')).toHaveLength(114)
  })
  it('picks five neutral swatches for the preset field', () => {
    const mini = neutralMini([...EXACT.neutral])
    expect(mini).toEqual(['F5F6F8', 'BFC4CC', '606876', '2F3948', '0B1220'])
  })
})
