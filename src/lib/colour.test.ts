import { hexToOklch } from './oklch'
import { describe, expect, it } from 'vitest'
import {
  clampAlpha,
  withAlpha,
  defaultUtilityHex,
  nextUtilityId,
  utilityKey,
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

describe('gen ramps in OKLCH', () => {
  const cases: Array<[string, string, number]> = [
    ['caution', 'EAB308', 9], ['warning', 'F97316', 9], ['success', '1F9D55', 9], ['critical', 'DC2626', 9],
    ['sky primary', '0EA5E9', 10], ['slate', '64748B', 9], ['stone', '78716C', 9], ['violet', '7C3AED', 10]
  ]
  for (const [name, colour, base] of cases) {
    describe(name, () => {
      const ramp = gen(colour, base)
      const o = ramp.map(hexToOklch)
      const dL = o.slice(1).map((x, i) => o[i].L - x.L)
      it('has 16 valid hex steps and the input exactly at the base step', () => {
        expect(ramp).toHaveLength(16)
        expect(ramp.every((h) => /^[0-9A-F]{6}$/.test(h))).toBe(true)
        expect(ramp[base - 1]).toBe(colour)
      })
      it('gets darker at every step with no jump', () => {
        expect(dL.every((d) => d > 0)).toBe(true)
        expect(Math.max(...dL)).toBeLessThan(0.125)
        const atBase = [dL[base - 2], dL[base - 1]]
        expect(Math.max(...atBase) / Math.min(...atBase)).toBeLessThan(3)
      })
      it('keeps the hue of the input on chromatic steps', () => {
        const h0 = hexToOklch(colour)
        if (h0.C < 0.05) return
        for (const x of o) {
          if (x.C < 0.03) continue
          const d = Math.abs(x.H - h0.H)
          expect(Math.min(d, 360 - d)).toBeLessThan(6)
        }
      })
      it('keeps colour in the dark end instead of going grey', () => {
        const c0 = hexToOklch(colour).C
        expect(o[15].C).toBeGreaterThan(c0 * 0.2)
      })
    })
  }
  it('is lighter than the old RGB blend would be at the first step and never muddier', () => {
    const light = gen('EAB308', 9).map(hexToOklch)
    expect(light[0].L).toBeGreaterThan(0.97)
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

describe('tertiary and utility colours', () => {
  it('adds tertiary after secondary and utilities after that, before neutral', () => {
    const s = defaultSettings()
    s.secondary = '#4852E5'
    s.tertiary = '#0EA5A4'
    s.utility = [{ id: 1, name: 'Utility 1', hex: '#0891b2' }, { id: 2, name: 'Utility 2', hex: '#7c3aed' }]
    const p = buildPalettes(s)
    expect(p.map((x) => x.key)).toEqual(['primary', 'secondary', 'tertiary', 'utility-1', 'utility-2', 'neutral', 'info', 'success', 'caution', 'warning', 'critical'])
    expect(p.map((x) => x.name).slice(3, 5)).toEqual(['Utility 1', 'Utility 2'])
    expect(p.reduce((n, x) => n + x.steps.length, 0)).toBe(11 * 16)
    expect(p[3].steps[9]).toBe('0891B2')
  })
  it('falls back to the starting colour for an invalid hex and to "Utility N" for a blank name', () => {
    const s = defaultSettings()
    s.utility = [{ id: 3, name: '  ', hex: 'zzz' }]
    const [, u] = buildPalettes(s)
    expect(u.key).toBe('utility-3')
    expect(u.name).toBe('Utility 3')
    expect(u.hex).toBe(defaultUtilityHex(3))
  })
  it('numbers new utility colours with the lowest free number', () => {
    expect(nextUtilityId([])).toBe(1)
    expect(nextUtilityId([{ id: 1, name: '', hex: '' }, { id: 3, name: '', hex: '' }])).toBe(2)
    expect(utilityKey(4)).toBe('utility-4')
  })
  it('exports CSS variables named after the utility key', () => {
    const s = defaultSettings()
    s.utility = [{ id: 1, name: 'Brand teal', hex: '#0891b2' }]
    const rows = tokenRows(buildPalettes(s))
    expect(rows).toHaveLength(128)
    expect(rows.some((r) => r.name === '--utility-1-10' && r.hex === '0891B2')).toBe(true)
  })
})

describe('alpha', () => {
  it('turns a colour and an opacity in percent into #RRGGBBAA digits', () => {
    expect(withAlpha('9D00D6', 100)).toBe('9D00D6FF')
    expect(withAlpha('9D00D6', 60)).toBe('9D00D699')
    expect(withAlpha('9D00D6', 0)).toBe('9D00D600')
    expect(withAlpha('9D00D6', 5)).toBe('9D00D60D')
    expect(clampAlpha(150)).toBe(100)
    expect(clampAlpha(-4)).toBe(0)
    expect(clampAlpha(NaN)).toBe(100)
  })
  it('defaults to 100 and adds no tokens', () => {
    const p = buildPalettes(defaultSettings())
    expect(p.every((x) => x.alpha === 100)).toBe(true)
    expect(tokenRows(p)).toHaveLength(112)
  })
  it('adds 16 alpha tokens for a palette set below 100%, only for that palette', () => {
    const s = defaultSettings()
    s.alpha = { primary: 60 }
    const p = buildPalettes(s)
    expect(p[0].alpha).toBe(60)
    expect(p[1].alpha).toBe(100)
    const rows = tokenRows(p)
    expect(rows).toHaveLength(128)
    expect(rows.find((r) => r.name === '--primary-10-alpha')).toEqual({ name: '--primary-10-alpha', hex: '9D00D699' })
    expect(rows.find((r) => r.name === '--primary-10')?.hex).toBe('9D00D6')
    expect(toCss(rows)).toContain('--primary-1-alpha: #FBF4FF99;')
  })
  it('works for utility and semantic colours, and treats a missing alpha map as 100', () => {
    const s = defaultSettings()
    s.utility = [{ id: 1, name: 'Utility 1', hex: '#0891b2' }]
    s.alpha = { 'utility-1': 40, critical: 80 }
    expect(tokenRows(buildPalettes(s))).toHaveLength(112 + 16 + 16 + 16)
    const old = { ...defaultSettings(), alpha: undefined as never }
    expect(buildPalettes(old).every((x) => x.alpha === 100)).toBe(true)
  })
})
