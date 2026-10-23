import { describe, expect, it } from 'vitest'
import { buildPalettes, defaultSettings } from './colour'
import { apcaLc } from './contrast'
import {
  ALPHA,
  TOKEN_DEFS,
  lcFor,
  overrideKey,
  parseRef,
  pickerChips,
  refLabel,
  resolveAll,
  resolveToken,
  toTokenCss
} from './tokens'

const palettes = buildPalettes(defaultSettings())
const byName = (n: string) => TOKEN_DEFS.find((d) => d.name === n)!

describe('token definitions', () => {
  it('has 58 tokens: 39 backgrounds, 12 text, 7 borders', () => {
    expect(TOKEN_DEFS).toHaveLength(58)
    expect(TOKEN_DEFS.filter((d) => d.group === 'bg')).toHaveLength(39)
    expect(TOKEN_DEFS.filter((d) => d.group === 'text')).toHaveLength(12)
    expect(TOKEN_DEFS.filter((d) => d.group === 'border')).toHaveLength(7)
  })
  it('has unique names', () => {
    expect(new Set(TOKEN_DEFS.map((d) => d.name)).size).toBe(58)
  })
  it('adds surface, hover, active and fill for each of the five semantic hues', () => {
    for (const k of ['info', 'success', 'caution', 'warning', 'critical']) {
      expect(byName(`bg-surface-${k}`).light).toBe(`${k}-3`)
      expect(byName(`bg-surface-${k}-hover`).light).toBe(`${k}-4`)
      expect(byName(`bg-surface-${k}-active`).light).toBe(`${k}-5`)
      expect(byName(`bg-fill-${k}`).kind).toBe('f')
    }
  })
  it('has the documented default light and dark refs', () => {
    expect(byName('bg')).toMatchObject({ light: 'neutral-3', dark: 'neutral-15' })
    expect(byName('bg-fill')).toMatchObject({ light: 'primary-10', dark: 'primary-9' })
    expect(byName('text')).toMatchObject({ light: 'neutral-16', dark: 'neutral-2' })
    expect(byName('border-brand')).toMatchObject({ light: 'primary-10', dark: 'primary-8' })
  })
})

describe('refs', () => {
  it('parses and labels refs', () => {
    expect(parseRef('neutral-3')).toEqual({ palette: 'neutral', step: 3 })
    expect(parseRef('blackA-5')).toEqual({ palette: 'blackA', step: 5 })
    expect(refLabel('blackA-5')).toBe('black-alpha-5')
    expect(refLabel('whiteA-4')).toBe('white-alpha-4')
    expect(refLabel('primary-10')).toBe('primary-10')
  })
})

describe('resolveToken', () => {
  it('resolves the default bg-fill to the primary base colour', () => {
    const t = resolveToken(byName('bg-fill'), {}, palettes)
    expect(t.light.hex).toBe('9D00D6')
    expect(t.light.palette).toBe('primary')
    expect(t.light.index).toBe(9)
    expect(t.dark.ref).toBe('primary-9')
    expect(t.light.available && t.dark.available).toBe(true)
    expect(t.light.overridden).toBe(false)
  })
  it('applies overrides per mode', () => {
    const o = { [overrideKey('bg-fill', 'dark')]: 'info-10' }
    const t = resolveToken(byName('bg-fill'), o, palettes)
    expect(t.dark.ref).toBe('info-10')
    expect(t.dark.hex).toBe('2563EB')
    expect(t.dark.overridden).toBe(true)
    expect(t.light.ref).toBe('primary-10')
    expect(t.light.overridden).toBe(false)
  })
  it('paints alpha tokens over a checkerboard with no hex or Lc', () => {
    const t = resolveToken(byName('bg-surface-disabled'), {}, palettes)
    expect(t.light.hex).toBeNull()
    expect(t.light.lc).toBeNull()
    expect(t.light.available).toBe(true)
    expect(t.light.paint).toContain('rgba(0,0,0,0.1)')
    expect(t.light.paint).toContain('repeating-conic-gradient')
    expect(t.dark.paint).toContain('rgba(255,255,255,0.08)')
  })
  it('follows the user palettes, not fixed defaults', () => {
    const s = defaultSettings()
    s.text.primary = '#0EA5E9'
    const p = buildPalettes(s)
    expect(resolveToken(byName('bg-fill'), {}, p).light.hex).toBe('0EA5E9')
  })
})

describe('lcFor', () => {
  const N = palettes.find((p) => p.key === 'neutral')!.steps
  const P = palettes.find((p) => p.key === 'primary')!.steps
  const h = '9D00D6'
  it('surface and fill: the stronger of neutral-16 text or white', () => {
    const expected = Math.round(Math.max(Math.abs(apcaLc(N[15], h)), Math.abs(apcaLc('FFFFFF', h))))
    expect(lcFor('s', 'light', h, palettes)).toBe(expected)
    expect(lcFor('f', 'dark', h, palettes)).toBe(expected)
  })
  it('text on fill: against primary-10 in light and primary-9 in dark', () => {
    expect(lcFor('o', 'light', N[0], palettes)).toBe(Math.round(Math.abs(apcaLc(N[0], P[9]))))
    expect(lcFor('o', 'dark', N[0], palettes)).toBe(Math.round(Math.abs(apcaLc(N[0], P[8]))))
  })
  it('text and borders: against neutral-1 in light and neutral-14 in dark', () => {
    expect(lcFor('t', 'light', N[15], palettes)).toBe(Math.round(Math.abs(apcaLc(N[15], N[0]))))
    expect(lcFor('b', 'dark', N[11], palettes)).toBe(Math.round(Math.abs(apcaLc(N[11], N[13]))))
  })
  it('is null for alpha colours and when the comparison palette is missing', () => {
    expect(lcFor('a', 'light', null, palettes)).toBeNull()
    const noNeutral = palettes.filter((p) => p.key !== 'neutral')
    expect(lcFor('t', 'light', h, noNeutral)).toBeNull()
    expect(lcFor('s', 'light', h, noNeutral)).toBeNull()
  })
  it('gives a strong value for the best text on the default fill', () => {
    expect(resolveToken(byName('bg-fill'), {}, palettes).light.lc).toBeGreaterThan(60)
  })
})

describe('resolveAll', () => {
  it('resolves all 58 with nothing missing by default', () => {
    const set = resolveAll(palettes, {})
    expect(set.tokens).toHaveLength(58)
    expect(set.resolvedCount).toBe(58)
    expect(set.missing).toEqual([])
  })
  it('marks tokens unavailable and lists the removed palettes', () => {
    const s = defaultSettings()
    s.neutral.enabled = false
    const set = resolveAll(buildPalettes(s), {})
    expect(set.missing).toEqual(['neutral'])
    expect(set.resolvedCount).toBeLessThan(58)
    const bg = set.tokens.find((t) => t.def.name === 'bg')!
    expect(bg.light.available).toBe(false)
    expect(bg.light.lc).toBeNull()
  })
  it('reports semantic palettes missing in display order', () => {
    const s = defaultSettings()
    s.semanticEnabled = false
    const set = resolveAll(buildPalettes(s), {})
    expect(set.missing).toEqual(['info', 'success', 'caution', 'warning', 'critical'])
  })
  it('does not count alpha tokens as missing palettes', () => {
    const s = defaultSettings()
    s.neutral.enabled = false
    s.semanticEnabled = false
    expect(resolveAll(buildPalettes(s), {}).missing).not.toContain('blackA')
  })
})

describe('toTokenCss', () => {
  const css = toTokenCss(resolveAll(palettes, {}).tokens)
  it('writes light values in :root and dark values in [data-theme="dark"]', () => {
    const [light, dark] = css.split('[data-theme="dark"]')
    expect(light).toContain('--bg-fill: var(--primary-10);')
    expect(dark).toContain('--bg-fill: var(--primary-9);')
  })
  it('writes alpha colours as rgb() with the alpha step value', () => {
    expect(css).toContain(`--bg-surface-disabled: rgb(0 0 0 / ${ALPHA[4]});`)
    expect(css).toContain(`--bg-surface-disabled: rgb(255 255 255 / ${ALPHA[3]});`)
  })
  it('has one line per token per mode', () => {
    expect(css.split('\n').filter((l) => l.trim().startsWith('--'))).toHaveLength(116)
  })
  it('skips tokens whose palette was removed', () => {
    const s = defaultSettings()
    s.neutral.enabled = false
    const out = toTokenCss(resolveAll(buildPalettes(s), {}).tokens)
    expect(out).not.toContain('--bg:')
    expect(out).toContain('--bg-fill: var(--primary-10);')
  })
})

describe('pickerChips', () => {
  it('offers the 7 palettes plus black and white alpha', () => {
    const chips = pickerChips(palettes)
    expect(chips.map((c) => c.key)).toEqual(['neutral', 'primary', 'info', 'success', 'caution', 'warning', 'critical', 'blackA', 'whiteA'])
  })
  it('includes secondary when added and omits removed palettes', () => {
    const s = defaultSettings()
    s.secondary = '#4852E5'
    s.semanticEnabled = false
    expect(pickerChips(buildPalettes(s)).map((c) => c.key)).toEqual(['neutral', 'primary', 'secondary', 'blackA', 'whiteA'])
  })
})
