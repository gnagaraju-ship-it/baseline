import { describe, expect, it } from 'vitest'
import { buildPalettes, defaultSettings } from './colour'
import { chartTheme } from './chartTheme'

const defaults = buildPalettes(defaultSettings())

describe('chartTheme', () => {
  it('reproduces the mockup dark theme from the default palettes (no secondary: c3 differs)', () => {
    const t = chartTheme('dark', defaults)
    expect(t).toMatchObject({ canvas: '#030712', card: '#161E2C', border: '#2F3948', text: '#F5F6F8', muted: '#BFC4CC', axis: '#9CA3AF', grid: '#2F3948', track: '#2F3948', c1: '#C252FB', c2: '#97BAFF', c4: '#606876' })
  })
  it('reproduces the mockup light series from the default palettes', () => {
    const t = chartTheme('light', defaults)
    expect(t).toMatchObject({ card: '#FFFFFF', track: '#EEF0F2', c1: '#AD2CE8', c4: '#BFC4CC', success: '#1F9D55', warning: '#F97316' })
  })
  it('follows the brand colour', () => {
    const s = defaultSettings()
    s.text.primary = '#0EA5E9'
    const t = chartTheme('light', buildPalettes(s))
    expect(t.c1).not.toBe('#AD2CE8')
    expect(t.c1).toBe(`#${buildPalettes(s)[0].steps[8]}`)
  })
  it('uses the Secondary hue for series 3 when present, else a Primary step', () => {
    const s = defaultSettings()
    s.secondary = '#4852E5'
    const withSecondary = buildPalettes(s)
    expect(chartTheme('light', withSecondary).c3).toBe('#4852E5')
    expect(chartTheme('light', defaults).c3).toBe(`#${defaults[0].steps[11]}`)
  })
  it('falls back to the mockup values when palettes are removed', () => {
    const s = defaultSettings()
    s.neutral.enabled = false
    s.semanticEnabled = false
    const t = chartTheme('dark', buildPalettes(s))
    expect(t.card).toBe('#161E2C')
    expect(t.c2).toBe('#97BAFF')
    expect(t.success).toBe('#1F9D55')
  })
})
