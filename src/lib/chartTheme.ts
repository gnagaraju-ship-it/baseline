/**
 * Colours for the UI preview charts, taken from the user's palette ramps.
 * The step choices reproduce the fixed THEMES in html/preview.html when the default palettes are used.
 * Missing palettes fall back to the mockup's literal values so the preview never breaks.
 */
import type { Palette, PaletteKey } from './colour'

export type PreviewMode = 'light' | 'dark'

export interface ChartTheme {
  canvas: string
  card: string
  border: string
  text: string
  muted: string
  axis: string
  grid: string
  track: string
  c1: string
  c2: string
  c3: string
  c4: string
  success: string
  warning: string
}

const FALLBACK: Record<PreviewMode, ChartTheme> = {
  light: { canvas: '#F4F4F5', card: '#FFFFFF', border: '#E4E4E7', text: '#18181B', muted: '#52525B', axis: '#71717A', grid: '#E4E4E7', track: '#EEF0F2', c1: '#AD2CE8', c2: '#8EA5FF', c3: '#4852E5', c4: '#BFC4CC', success: '#1F9D55', warning: '#F97316' },
  dark: { canvas: '#030712', card: '#161E2C', border: '#2F3948', text: '#F5F6F8', muted: '#BFC4CC', axis: '#9CA3AF', grid: '#2F3948', track: '#2F3948', c1: '#C252FB', c2: '#97BAFF', c3: '#7C86F2', c4: '#606876', success: '#1F9D55', warning: '#F97316' }
}

/** Step per theme slot: [palette, light step, dark step], 1-based. */
const SLOTS: Partial<Record<keyof ChartTheme, [PaletteKey, number, number]>> = {
  canvas: ['neutral', 2, 16],
  border: ['neutral', 4, 12],
  text: ['neutral', 16, 2],
  muted: ['neutral', 11, 6],
  axis: ['neutral', 8, 7],
  grid: ['neutral', 4, 12],
  track: ['neutral', 3, 12],
  c1: ['primary', 9, 8],
  c2: ['info', 7, 6],
  c3: ['secondary', 10, 8],
  c4: ['neutral', 6, 9],
  success: ['success', 9, 9],
  warning: ['warning', 9, 9]
}

export function chartTheme(mode: PreviewMode, palettes: Palette[]): ChartTheme {
  const theme: ChartTheme = { ...FALLBACK[mode] }
  const step = (key: PaletteKey, n: number) => {
    const h = palettes.find((p) => p.key === key)?.steps[n - 1]
    return h ? `#${h}` : null
  }
  for (const [slot, [key, light, dark]] of Object.entries(SLOTS) as Array<[keyof ChartTheme, [PaletteKey, number, number]]>) {
    const v = step(key, mode === 'light' ? light : dark)
    if (v) theme[slot] = v
  }
  // Card is white in light mode and neutral-14 in dark mode.
  if (mode === 'dark') theme.card = step('neutral', 14) ?? theme.card
  // Without a Secondary hue, series 3 uses a darker (light) or lighter (dark) step of Primary.
  if (!palettes.some((p) => p.key === 'secondary')) theme.c3 = step('primary', mode === 'light' ? 12 : 6) ?? theme.c3
  return theme
}
