import { describe, expect, it } from 'vitest'
import { defaultSettings } from './colour'
import { defaultElevationSettings } from './elevation'
import type { ExportInput } from './exportAll'
import { buildFigmaTokens, figmaTokenCount, figmaTokensJson } from './figmaExport'
import { defaultGridSettings } from './grid'
import { defaultSpacingSettings } from './spacing'
import { defaultTypeSettings } from './typeScale'

const input = (): ExportInput => ({
  settings: defaultSettings(), tokenOverrides: {}, type: defaultTypeSettings(), grid: defaultGridSettings(),
  spacing: defaultSpacingSettings(), elevation: defaultElevationSettings()
})

type J = Record<string, any>
const doc = () => buildFigmaTokens(input()) as J

function leaves(node: any, path: string[] = []): Array<{ path: string[]; leaf: J }> {
  if (node && typeof node === 'object' && '$value' in node) return [{ path, leaf: node }]
  if (!node || typeof node !== 'object') return []
  return Object.entries(node).filter(([k]) => !k.startsWith('$')).flatMap(([k, v]) => leaves(v, [...path, k]))
}

function lookup(d: J, ref: string): J | undefined {
  return ref.slice(1, -1).split('.').reduce((o: any, k) => o?.[k], d)
}

describe('figma / DTCG export', () => {
  it('has the documented top-level groups', () => {
    expect(Object.keys(doc())).toEqual(['$description', 'Primitives', 'Semantic', 'Type', 'Grid', 'Spacing', 'Elevation', '$extensions'])
    expect(doc().$description).toContain('com.figma')
  })

  it('exports all 112 ramp steps as hex colours, plus 32 alpha steps', () => {
    const colour = doc().Primitives.colour
    expect(Object.keys(colour)).toEqual(['primary', 'neutral', 'info', 'success', 'caution', 'warning', 'critical', 'black-alpha', 'white-alpha'])
    expect(leaves(colour.primary)).toHaveLength(16)
    expect(colour.primary['10']).toEqual({ $type: 'color', $value: '#9D00D6' })
    expect(leaves(colour).filter((l) => !l.path[0].endsWith('alpha'))).toHaveLength(112)
    expect(colour['black-alpha']['5'].$value).toBe('#0000001A')
    expect(colour['white-alpha']['16'].$value).toBe('#FFFFFFE6')
  })

  it('exports 58 semantic tokens as aliases with Light and Dark modes that resolve to primitives', () => {
    const d = doc()
    const sem = leaves(d.Semantic.colour)
    expect(sem).toHaveLength(58)
    for (const { leaf } of sem) {
      expect(leaf.$type).toBe('color')
      const modes = leaf.$extensions['com.figma'].modes
      for (const ref of [leaf.$value, modes.Light, modes.Dark]) {
        expect(ref).toMatch(/^\{Primitives\.colour\.[a-z-]+\.\d+\}$/)
        expect(lookup(d, ref)?.$type).toBe('color')
      }
      expect(modes.Light).toBe(leaf.$value)
    }
    const fill = d.Semantic.colour['bg-fill']
    expect(fill.$value).toBe('{Primitives.colour.primary.10}')
    expect(fill.$extensions['com.figma'].modes.Dark).toBe('{Primitives.colour.primary.9}')
    expect(d.Semantic.colour['bg-surface-disabled'].$extensions['com.figma'].modes.Light).toBe('{Primitives.colour.black-alpha.5}')
  })

  it('follows token remaps and leaves out unresolved tokens', () => {
    const i = input()
    i.tokenOverrides = { 'bg-fill|light': 'info-10' }
    expect((buildFigmaTokens(i) as J).Semantic.colour['bg-fill'].$value).toBe('{Primitives.colour.info.10}')
    i.settings.neutral.enabled = false
    const d = buildFigmaTokens(i) as J
    expect(d.Semantic.colour.text).toBeUndefined()
    expect(d.Primitives.colour.neutral).toBeUndefined()
  })

  it('exports type, grid, spacing and elevation', () => {
    const d = doc()
    expect(d.Type['heading-xl'].size).toEqual({ $type: 'dimension', $value: '25px' })
    expect(d.Type['heading-xl']['line-height'].$value).toBe('32px')
    expect(d.Type['heading-xl']['letter-spacing']).toMatchObject({ $type: 'number', $value: -0.01 })
    expect(Object.keys(d.Grid)).toEqual(['xxl', 'md', 'xs'])
    expect(d.Grid.xxl.columns).toEqual({ $type: 'number', $value: 12 })
    expect(d.Grid.xxl.column.$value).toBe('69.33px')
    expect(d.Spacing.space['24']).toEqual({ $type: 'dimension', $value: '24px' })
    expect(d.Spacing['stack-md'].xs.$value).toBe('12px')
    expect(d.Elevation.md).toEqual({
      $type: 'shadow',
      $value: [{ color: '#0000001F', offsetX: '0px', offsetY: '6px', blur: '16px', spread: '0px' }]
    })
  })

  it('exports the heading and body fonts once, and every step with family, weight, size, line height and tracking', () => {
    const d = doc()
    expect(d.Type['font-family']).toEqual({ heading: { $type: 'fontFamily', $value: 'Raleway' }, body: { $type: 'fontFamily', $value: 'Nunito' } })
    const step = d.Type['heading-xl']
    expect(Object.keys(step)).toEqual(['family', 'weight', 'size', 'line-height', 'letter-spacing'])
    expect(step.family).toEqual({ $type: 'fontFamily', $value: '{Type.font-family.heading}' })
    expect(step.weight).toEqual({ $type: 'fontWeight', $value: 500 })
    expect(d.Type['body-md'].family.$value).toBe('{Type.font-family.body}')
    expect(d.Type['body-md'].weight.$value).toBe(400)
    expect(d.Type['label-xs'].weight.$value).toBe(500)
    expect(Object.keys(d.Type)).toHaveLength(1 + 11)
    expect(lookup(d, step.family.$value)?.$value).toBe('Raleway')
  })

  it('follows the chosen fonts, and uses SF Pro on Apple platforms', () => {
    const i = input()
    i.type.headingFont = 'Playfair Display'
    i.type.bodyFont = 'Lora'
    expect((buildFigmaTokens(i) as J).Type['font-family'].heading.$value).toBe('Playfair Display')
    expect((buildFigmaTokens(i) as J).Type['font-family'].body.$value).toBe('Lora')
    i.type.platform = 2
    const a = buildFigmaTokens(i) as J
    expect(a.Type['font-family']).toEqual({ heading: { $type: 'fontFamily', $value: 'SF Pro Display' }, body: { $type: 'fontFamily', $value: 'SF Pro Text' } })
  })

  it('weight variants are complete text styles that alias the base step for size, line height and tracking', () => {
    const i = input()
    i.type.variants = { 'body-md': [600] }
    const v = (buildFigmaTokens(i) as J).Type['body-md-semibold']
    expect(v.weight).toEqual({ $type: 'fontWeight', $value: 600 })
    expect(v.family.$value).toBe('{Type.font-family.body}')
    expect(v.size.$value).toBe('{Type.body-md.size}')
    expect(v['line-height'].$value).toBe('{Type.body-md.line-height}')
    expect(v['letter-spacing'].$value).toBe('{Type.body-md.letter-spacing}')
  })

  it('weight variants become fontWeight tokens', () => {
    const i = input()
    i.type.variants = { 'body-md': [600] }
    expect((buildFigmaTokens(i) as J).Type['body-md-semibold'].weight).toEqual({ $type: 'fontWeight', $value: 600 })
  })

  it('only includes enabled breakpoints and steps, and uses the shadow colour', () => {
    const i = input()
    i.grid.on = { xxl: true, md: false, xs: true }
    i.spacing.on[24] = false
    i.elevation.shadow = '#1E3A8A'
    const d = buildFigmaTokens(i) as J
    expect(Object.keys(d.Grid)).toEqual(['xxl', 'xs'])
    expect(d.Spacing.space['24']).toBeUndefined()
    expect(d.Spacing['stack-md'].md).toBeUndefined()
    expect(d.Elevation.md.$value[0].color).toBe('#1E3A8A1F')
  })

  it('every token leaf has $type and $value, and the file is valid JSON', () => {
    const d = doc()
    for (const g of ['Primitives', 'Semantic', 'Type', 'Grid', 'Spacing', 'Elevation']) {
      for (const { leaf } of leaves(d[g])) {
        expect(leaf.$type).toBeTruthy()
        expect(leaf.$value).toBeDefined()
      }
    }
    const text = figmaTokensJson(input())
    expect(JSON.parse(text)).toEqual(d)
    expect(text.endsWith('\n')).toBe(true)
  })

  it('adds a <palette>-alpha primitive group only for colours below 100% opacity', () => {
    const i = input()
    i.settings.alpha = { primary: 60 }
    const colour = (buildFigmaTokens(i) as J).Primitives.colour
    expect(Object.keys(colour)).toContain('primary-alpha')
    expect(colour['primary-alpha']['10']).toEqual({ $type: 'color', $value: '#9D00D699' })
    expect(Object.keys(colour['primary-alpha'])).toHaveLength(16)
    expect(colour['info-alpha']).toBeUndefined()
    expect(colour.primary['10'].$value).toBe('#9D00D6')
  })

  it('writes a literal #RRGGBBAA for a token value with its own opacity, and keeps aliases elsewhere', () => {
    const i = input()
    i.tokenAlpha = { 'bg-fill|light': 60 }
    const fill = (buildFigmaTokens(i) as J).Semantic.colour['bg-fill']
    expect(fill.$value).toBe('#9D00D699')
    expect(fill.$extensions['com.figma'].modes).toEqual({ Light: '#9D00D699', Dark: '{Primitives.colour.primary.9}' })
    expect((buildFigmaTokens(i) as J).Semantic.colour['bg-fill-hover'].$value).toBe('{Primitives.colour.primary.11}')
  })

  it('counts tokens', () => {
    expect(figmaTokenCount(doc())).toBeGreaterThan(112 + 58)
  })
})
