import { describe, expect, it } from 'vitest'
import {
  ELEVATION_PRESETS, addLayer, addLevel, defaultElevationSettings, layerCss, loadPreset, parseField, removeLayer, removeLevel,
  renameLevel, sanitiseName, setLayerField, shadowCss, toElevationCss, type ElevationPresetKey
} from './elevation'

describe('presets', () => {
  it('has the documented level counts and groups', () => {
    const counts = Object.fromEntries((Object.keys(ELEVATION_PRESETS) as ElevationPresetKey[]).map((k) => [k, ELEVATION_PRESETS[k].levels.length]))
    expect(counts).toEqual({ tailwind: 7, soft: 5, fluent: 6, ant: 3, bootstrap: 3, material: 9, carbon: 3, custom: 4 })
    expect(ELEVATION_PRESETS.material.group).toBe('HARD')
    expect(ELEVATION_PRESETS.carbon.group).toBe('HARD')
    expect(ELEVATION_PRESETS.tailwind.group).toBe('SOFT')
    expect(ELEVATION_PRESETS.custom.group).toBe('')
  })
  it('generates Material levels from dp', () => {
    const m = loadPreset('material')
    expect(m.map((l) => l.name)).toEqual(['1', '2', '3', '4', '6', '8', '12', '16', '24'])
    expect(m[8].layers[0]).toEqual({ x: 0, y: 12, blur: 24, spread: 0, op: 20 })
    expect(m[8].layers[1]).toEqual({ x: 0, y: 6, blur: 12, spread: 0, op: 14 })
    expect(m[0].layers[1].y).toBe(1)
  })
  it('starts on Soft ambient with a black shadow, and loads independent copies', () => {
    const d = defaultElevationSettings()
    expect(d.preset).toBe('soft')
    expect(d.shadow).toBe('#000000')
    expect(d.tokens.map((t) => t.name)).toEqual(['xs', 'sm', 'md', 'lg', 'xl'])
    d.tokens[0].layers[0].y = 99
    expect(loadPreset('soft')[0].layers[0].y).toBe(1)
  })
})

describe('css', () => {
  it('formats a layer and joins layers with a comma', () => {
    expect(layerCss({ x: 0, y: 1, blur: 3, spread: 0, op: 8 }, [0, 0, 0])).toBe('0px 1px 3px 0px rgba(0, 0, 0, 0.08)')
    const t = loadPreset('tailwind')[2]
    expect(shadowCss(t.layers, '#000000')).toBe('0px 1px 3px 0px rgba(0, 0, 0, 0.1), 0px 1px 2px -1px rgba(0, 0, 0, 0.1)')
  })
  it('uses the base colour and falls back to black when it is invalid', () => {
    const layers = loadPreset('soft')[0].layers
    expect(shadowCss(layers, '#1e3a8a')).toContain('rgba(30, 58, 138, 0.08)')
    expect(shadowCss(layers, 'nope')).toContain('rgba(0, 0, 0, 0.08)')
  })
  it('exports one custom property per level', () => {
    const css = toElevationCss(loadPreset('carbon'), '#000000')
    expect(css.startsWith(':root {\n  --elevation-low: 0px 1px 2px 0px rgba(0, 0, 0, 0.3);')).toBe(true)
    expect(css.match(/--elevation-/g)).toHaveLength(3)
  })
})

describe('editing', () => {
  const base = loadPreset('soft')
  it('adds a level that doubles y and blur of the last one, or starts from a default', () => {
    const next = addLevel(base)
    expect(next).toHaveLength(6)
    expect(next[5].name).toBe('level-6')
    expect(next[5].layers[0]).toEqual({ x: 0, y: 48, blur: 128, spread: 0, op: 16 })
    expect(base).toHaveLength(5)
    expect(addLevel([])[0]).toEqual({ name: 'level-1', layers: [{ x: 0, y: 2, blur: 6, spread: 0, op: 12 }] })
  })
  it('adds layers and never removes the last one', () => {
    const two = addLayer(base, 0)
    expect(two[0].layers).toHaveLength(2)
    expect(two[0].layers[1]).toEqual({ x: 0, y: 1, blur: 2, spread: 0, op: 6 })
    expect(removeLayer(two, 0, 1)[0].layers).toHaveLength(1)
    expect(removeLayer(base, 0, 0)).toBe(base)
  })
  it('removes levels, including the last one', () => {
    expect(removeLevel(base, 1).map((t) => t.name)).toEqual(['xs', 'md', 'lg', 'xl'])
    expect(removeLevel(removeLevel([base[0]], 0), 0)).toEqual([])
  })
  it('sets a field without touching the input', () => {
    const next = setLayerField(base, 2, 0, 'blur', 20)
    expect(next[2].layers[0].blur).toBe(20)
    expect(base[2].layers[0].blur).toBe(16)
  })
  it('renames with sanitising and ignores an empty name', () => {
    expect(sanitiseName('  my level/1 ')).toBe('my-level-1')
    expect(renameLevel(base, 0, 'hero card')[0].name).toBe('hero-card')
    expect(renameLevel(base, 0, '   ')).toBe(base)
  })
  it('parses fields: non-numeric is 0, opacity is clamped, spread may be negative', () => {
    expect(parseField('blur', 'abc')).toBe(0)
    expect(parseField('spread', '-12')).toBe(-12)
    expect(parseField('op', '150')).toBe(100)
    expect(parseField('op', '-5')).toBe(0)
    expect(parseField('y', '1.5')).toBe(1.5)
  })
})
