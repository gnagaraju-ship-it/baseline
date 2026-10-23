/**
 * Shadow presets and elevation tokens. Ported from PRESETS, load, css and the edit helpers in html/elevation.html.
 */
import { norm, rgb } from './colour'

export interface Layer { x: number; y: number; blur: number; spread: number; op: number }
export interface Level { name: string; layers: Layer[] }

const L = (x: number, y: number, blur: number, spread: number, op: number): Layer => ({ x, y, blur, spread, op })

export type ElevationPresetKey = 'tailwind' | 'soft' | 'fluent' | 'ant' | 'bootstrap' | 'material' | 'carbon' | 'custom'

type Def = Array<[string, Layer[]]>

export const ELEVATION_PRESETS: Record<ElevationPresetKey, { label: string; group: 'SOFT' | 'HARD' | ''; levels: Def }> = {
  tailwind: {
    label: 'Tailwind', group: 'SOFT',
    levels: [
      ['2xs', [L(0, 1, 0, 0, 5)]], ['xs', [L(0, 1, 2, 0, 5)]],
      ['sm', [L(0, 1, 3, 0, 10), L(0, 1, 2, -1, 10)]], ['md', [L(0, 4, 6, -1, 10), L(0, 2, 4, -2, 10)]],
      ['lg', [L(0, 10, 15, -3, 10), L(0, 4, 6, -4, 10)]], ['xl', [L(0, 20, 25, -5, 10), L(0, 8, 10, -6, 10)]],
      ['2xl', [L(0, 25, 50, -12, 25)]]
    ]
  },
  soft: {
    label: 'Soft ambient', group: 'SOFT',
    levels: [['xs', [L(0, 1, 3, 0, 8)]], ['sm', [L(0, 2, 8, 0, 10)]], ['md', [L(0, 6, 16, 0, 12)]], ['lg', [L(0, 12, 32, 0, 14)]], ['xl', [L(0, 24, 64, 0, 16)]]]
  },
  fluent: {
    label: 'Fluent', group: 'SOFT',
    levels: [
      ['2', [L(0, 1, 2, 0, 14), L(0, 0, 2, 0, 12)]], ['4', [L(0, 2, 4, 0, 14), L(0, 0, 2, 0, 12)]],
      ['8', [L(0, 4, 8, 0, 14), L(0, 0, 2, 0, 12)]], ['16', [L(0, 8, 16, 0, 14), L(0, 0, 2, 0, 12)]],
      ['28', [L(0, 14, 28, 0, 24), L(0, 0, 8, 0, 20)]], ['64', [L(0, 32, 64, 0, 24), L(0, 0, 8, 0, 20)]]
    ]
  },
  ant: {
    label: 'Ant Design', group: 'SOFT',
    levels: [
      ['1', [L(0, 6, 16, 0, 8), L(0, 3, 6, -4, 12), L(0, 9, 28, 8, 5)]],
      ['2', [L(0, 3, 6, -4, 12), L(0, 6, 16, 0, 8), L(0, 9, 28, 8, 5)]],
      ['3', [L(0, 12, 48, 16, 3), L(0, 9, 28, 0, 5), L(0, 6, 16, -8, 8)]]
    ]
  },
  bootstrap: { label: 'Bootstrap', group: 'SOFT', levels: [['sm', [L(0, 2, 4, 0, 8)]], ['md', [L(0, 8, 16, 0, 15)]], ['lg', [L(0, 16, 48, 0, 18)]]] },
  material: {
    label: 'Material', group: 'HARD',
    levels: [1, 2, 3, 4, 6, 8, 12, 16, 24].map((dp): [string, Layer[]] => [String(dp), [L(0, Math.round(dp / 2), dp, 0, 20), L(0, Math.max(1, Math.round(dp / 4)), Math.round(dp / 2), 0, 14)]])
  },
  carbon: { label: 'Carbon', group: 'HARD', levels: [['low', [L(0, 1, 2, 0, 30)]], ['raised', [L(0, 2, 6, 0, 30)]], ['overlay', [L(0, 4, 8, 0, 30)]]] },
  custom: { label: 'Custom', group: '', levels: [['xs', [L(0, 1, 2, 0, 10)]], ['sm', [L(0, 2, 6, 0, 12)]], ['md', [L(0, 6, 14, 0, 14)]], ['lg', [L(0, 14, 32, 0, 18)]]] }
}

export interface ElevationSettings {
  preset: ElevationPresetKey
  tokens: Level[]
  /** Raw base colour text. */
  shadow: string
}

export function loadPreset(key: ElevationPresetKey): Level[] {
  return ELEVATION_PRESETS[key].levels.map(([name, layers]) => ({ name, layers: layers.map((l) => ({ ...l })) }))
}

export function defaultElevationSettings(): ElevationSettings {
  return { preset: 'soft', tokens: loadPreset('soft'), shadow: '#000000' }
}

export function layerCss(l: Layer, rgbChannels: number[]): string {
  return `${l.x}px ${l.y}px ${l.blur}px ${l.spread}px rgba(${rgbChannels.join(', ')}, ${l.op / 100})`
}

/** box-shadow value for a level; an invalid base colour falls back to black. */
export function shadowCss(layers: Layer[], baseText: string): string {
  const c = rgb(norm(baseText) ?? '000000')
  return layers.map((l) => layerCss(l, c)).join(', ')
}

/** Letters, digits, "-" and "_" only, so the name stays a valid custom-property suffix. Empty stays empty. */
export function sanitiseName(text: string): string {
  return text.trim().replace(/[^A-Za-z0-9_-]/g, '-')
}

export type LayerField = keyof Layer

/** Parses typed numbers; non-numeric text is 0 and opacity is clamped to 0..100. */
export function parseField(field: LayerField, text: string): number {
  const n = parseFloat(text)
  const v = Number.isNaN(n) ? 0 : n
  return field === 'op' ? Math.max(0, Math.min(100, v)) : v
}

const copy = (tokens: Level[]): Level[] => tokens.map((t) => ({ name: t.name, layers: t.layers.map((l) => ({ ...l })) }))

export function renameLevel(tokens: Level[], i: number, text: string): Level[] {
  const name = sanitiseName(text)
  if (!name) return tokens
  const next = copy(tokens)
  next[i].name = name
  return next
}

export function removeLevel(tokens: Level[], i: number): Level[] {
  const next = copy(tokens)
  next.splice(i, 1)
  return next
}

export function addLevel(tokens: Level[]): Level[] {
  const next = copy(tokens)
  const last = next[next.length - 1]
  next.push({
    name: `level-${next.length + 1}`,
    layers: last ? last.layers.map((l) => ({ ...l, y: l.y * 2, blur: l.blur * 2 })) : [L(0, 2, 6, 0, 12)]
  })
  return next
}

export function addLayer(tokens: Level[], i: number): Level[] {
  const next = copy(tokens)
  next[i].layers.push(L(0, 1, 2, 0, 6))
  return next
}

export function removeLayer(tokens: Level[], i: number, j: number): Level[] {
  if (tokens[i].layers.length <= 1) return tokens
  const next = copy(tokens)
  next[i].layers.splice(j, 1)
  return next
}

export function setLayerField(tokens: Level[], i: number, j: number, field: LayerField, value: number): Level[] {
  const next = copy(tokens)
  next[i].layers[j][field] = value
  return next
}

export function toElevationCss(tokens: Level[], baseText: string): string {
  return `:root {\n${tokens.map((t) => `  --elevation-${t.name}: ${shadowCss(t.layers, baseText)};`).join('\n')}\n}`
}
