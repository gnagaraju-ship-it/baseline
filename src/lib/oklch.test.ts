import { describe, expect, it } from 'vitest'
import { fitToGamut, hexToOklch, inGamut, oklchToHex } from './oklch'

const hexes = ['000000', 'FFFFFF', '9D00D6', '2563EB', 'EAB308', 'F97316', '1F9D55', 'DC2626', '606876', '0EA5E9', 'FF00FF', '00FF00']
const ch = (h: string) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))

describe('oklch', () => {
  it('has the known lightness of black, white and mid colours', () => {
    expect(hexToOklch('000000').L).toBeCloseTo(0, 3)
    expect(hexToOklch('FFFFFF').L).toBeCloseTo(1, 3)
    expect(hexToOklch('FFFFFF').C).toBeLessThan(0.001)
    const red = hexToOklch('FF0000')
    expect(red.L).toBeCloseTo(0.628, 2)
    expect(red.C).toBeCloseTo(0.258, 2)
    expect(red.H).toBeCloseTo(29.2, 0)
  })
  it('round-trips hex through OKLCH within one 8-bit step', () => {
    for (const h of hexes) {
      const back = oklchToHex(hexToOklch(h))
      const d = ch(h).map((v, i) => Math.abs(v - ch(back)[i]))
      expect(Math.max(...d)).toBeLessThanOrEqual(1)
    }
  })
  it('detects colours outside sRGB', () => {
    expect(inGamut(hexToOklch('1F9D55'))).toBe(true)
    expect(inGamut({ L: 0.5, C: 0.4, H: 150 })).toBe(false)
  })
  it('fits an out-of-gamut colour by lowering chroma only', () => {
    const wild = { L: 0.6, C: 0.5, H: 200 }
    const fit = fitToGamut(wild)
    expect(fit.L).toBe(wild.L)
    expect(fit.H).toBe(wild.H)
    expect(fit.C).toBeLessThan(wild.C)
    expect(fit.C).toBeGreaterThan(0.05)
    expect(inGamut(fit)).toBe(true)
    const ok = { L: 0.7, C: 0.05, H: 20 }
    expect(fitToGamut(ok)).toBe(ok)
  })
  it('always produces a valid six-digit hex', () => {
    for (const c of [{ L: 1.2, C: 0.5, H: 10 }, { L: -0.1, C: 0.3, H: 300 }, { L: 0.5, C: 0, H: 0 }]) {
      expect(oklchToHex(c)).toMatch(/^[0-9A-F]{6}$/)
    }
  })
})
