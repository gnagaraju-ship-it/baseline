/**
 * W3C Design Tokens (DTCG) export for Figma Variables, Tokens Studio and Style Dictionary.
 * Colours are hex, aliases are written "{Group.path.token}", and Figma's Light / Dark modes live in
 * $extensions["com.figma"].modes because the DTCG format has no modes of its own.
 */
import { buildPalettes, norm, withAlpha } from './colour'
import { BREAKPOINTS, type BreakpointKey } from './grid'
import type { ExportInput } from './exportAll'
import { onValues, scaleSteps, spacingBreakpoints, spacingTokens } from './spacing'
import { ALPHA, resolveAll, type ResolvedCell } from './tokens'
import { gridByBreakpoint, typeByBreakpoint, type ByBreakpoint } from './responsive'
import { isWeb, typeFonts, withGridBreakpoints } from './typeScale'

type Json = Record<string, unknown>

const px = (n: number) => `${+n.toFixed(2)}px`
const color = (hex: string) => ({ $type: 'color', $value: `#${hex}` })
const dimension = (n: number) => ({ $type: 'dimension', $value: px(n) })

/** "#RRGGBBAA" for a colour and an alpha in 0..1. */
function hexAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
  return `#${hex}${(a < 16 ? '0' : '') + a.toString(16).toUpperCase()}`
}

/** A token value: an alias to its ramp step, or the literal #RRGGBBAA when the token has its own opacity. */
function value(c: ResolvedCell): string {
  return c.alpha < 100 && c.hex ? `#${withAlpha(c.hex, c.alpha)}` : alias(c)
}

function alias(c: ResolvedCell): string {
  const p = c.palette === 'blackA' ? 'black-alpha' : c.palette === 'whiteA' ? 'white-alpha' : c.palette
  return `{Primitives.colour.${p}.${c.index + 1}}`
}

export function buildFigmaTokens(input: ExportInput): Json {
  const palettes = buildPalettes(input.settings)
  const resolved = resolveAll(palettes, input.tokenOverrides, input.tokenAlpha)

  const ramps: Json = {}
  for (const p of palettes) {
    const steps: Json = {}
    p.steps.forEach((h, i) => (steps[String(i + 1)] = color(h)))
    ramps[p.key] = steps
  }
  for (const p of palettes) {
    if (p.alpha >= 100) continue
    const steps: Json = {}
    p.steps.forEach((h, i) => (steps[String(i + 1)] = { $type: 'color', $value: `#${withAlpha(h, p.alpha)}` }))
    ramps[`${p.key}-alpha`] = steps
  }
  for (const [key, base] of [['black-alpha', '000000'], ['white-alpha', 'FFFFFF']] as const) {
    const steps: Json = {}
    ALPHA.forEach((a, i) => (steps[String(i + 1)] = { $type: 'color', $value: hexAlpha(base, a) }))
    ramps[key] = steps
  }

  const semantic: Json = {}
  for (const t of resolved.tokens) {
    if (!(t.light.available && t.dark.available)) continue
    semantic[t.def.name] = {
      $type: 'color',
      $value: value(t.light),
      $extensions: { 'com.figma': { modes: { Light: value(t.light), Dark: value(t.dark) } } }
    }
  }

  // Values that change by breakpoint carry Figma modes XXL, MD and XS, the way Semantic colours carry Light and Dark.
  const byBp = typeByBreakpoint(input.type, input.grid)
  const type = withGridBreakpoints(input.type, input.grid.on.md, input.grid.on.xs)
  const modes = (v: ByBreakpoint<string | number>) => ({ 'com.figma': { modes: { XXL: v.xxl, MD: v.md, XS: v.xs } } })
  const rowAt = (bp: BreakpointKey, name: string) => byBp[bp].flatMap((g) => g.rows).find((r) => r.name === name)!
  const responsiveDimension = (name: string, pick: (r: ReturnType<typeof rowAt>) => number) => ({
    $type: 'dimension',
    $value: px(pick(rowAt('xxl', name))),
    $extensions: modes({ xxl: px(pick(rowAt('xxl', name))), md: px(pick(rowAt('md', name))), xs: px(pick(rowAt('xs', name))) })
  })

  // Fonts are named once under font-family; every step points at its role, so changing the font changes the scale.
  const fonts = typeFonts(type)
  const typeTokens: Json = {
    'font-family': { heading: { $type: 'fontFamily', $value: fonts.heading }, body: { $type: 'fontFamily', $value: fonts.body } }
  }
  for (const g of byBp.xxl) {
    for (const r of g.rows) {
      typeTokens[r.name] = {
        family: { $type: 'fontFamily', $value: `{Type.font-family.${r.font}}` },
        weight: { $type: 'fontWeight', $value: r.weight },
        size: responsiveDimension(r.name, (x) => x.size),
        'line-height': responsiveDimension(r.name, (x) => x.lh),
        'letter-spacing': { $type: 'number', $value: r.tr, $description: 'em' }
      }
      // A weight variant is a full text style: the same size, line height and tracking at another weight.
      const same = (k: string) => modes({ xxl: `{Type.${r.name}.${k}}`, md: `{Type.${r.name}.${k}}`, xs: `{Type.${r.name}.${k}}` })
      for (const v of r.variants) {
        typeTokens[v.name] = {
          family: { $type: 'fontFamily', $value: `{Type.font-family.${r.font}}` },
          weight: { $type: 'fontWeight', $value: v.weight },
          size: { $type: 'dimension', $value: `{Type.${r.name}.size}`, $extensions: same('size') },
          'line-height': { $type: 'dimension', $value: `{Type.${r.name}.line-height}`, $extensions: same('line-height') },
          'letter-spacing': { $type: 'number', $value: `{Type.${r.name}.letter-spacing}`, $description: 'em' }
        }
      }
    }
  }

  const layouts = gridByBreakpoint(input.grid)
  const gridMode = (kind: 'dimension' | 'number', pick: (l: (typeof layouts)['xxl']) => number, bpValue?: (k: BreakpointKey) => number): Json => {
    const val = (k: BreakpointKey) => (kind === 'dimension' ? px(bpValue ? bpValue(k) : pick(layouts[k])) : (bpValue ? bpValue(k) : pick(layouts[k])))
    return { $type: kind, $value: val('xxl'), $extensions: modes({ xxl: val('xxl'), md: val('md'), xs: val('xs') }) }
  }
  const widths: ByBreakpoint<number> = { xxl: 1400, md: 768, xs: 390 }
  for (const bp of BREAKPOINTS) widths[bp.key] = bp.width
  const grid: Json = {
    width: gridMode('dimension', () => 0, (k) => widths[k]),
    columns: gridMode('number', (l) => l.columns),
    gutter: gridMode('dimension', (l) => l.gutter),
    margin: gridMode('dimension', (l) => l.margin),
    sidebar: gridMode('dimension', (l) => l.sidebarWidth),
    column: gridMode('dimension', (l) => l.column)
  }

  const steps = scaleSteps(input.spacing.base, input.spacing.extra)
  const enabled = onValues(steps, input.spacing.on)
  const space: Json = {}
  for (const v of enabled) space[String(v)] = dimension(v)
  const spacing: Json = { space }
  for (const g of spacingTokens(input.grid, spacingBreakpoints(input.spacing, input.grid), enabled)) {
    for (const r of g.rows) {
      if (!r.cells.length) continue
      // A breakpoint without its own value (switched off) uses the nearest larger one.
      const at = (k: BreakpointKey) => (r.cells.find((c) => c.bp === k) ?? r.cells.find((c) => c.bp === 'xxl') ?? r.cells[0]).value
      spacing[r.name] = { $type: 'dimension', $value: px(at('xxl')), $extensions: modes({ xxl: px(at('xxl')), md: px(at('md')), xs: px(at('xs')) }) }
    }
  }

  const base = norm(input.elevation.shadow) ?? '000000'
  const elevation: Json = {}
  for (const t of input.elevation.tokens) {
    elevation[t.name] = {
      $type: 'shadow',
      $value: t.layers.map((l) => ({ color: hexAlpha(base, l.op / 100), offsetX: px(l.x), offsetY: px(l.y), blur: px(l.blur), spread: px(l.spread) }))
    }
  }

  return {
    $description: 'Baseline design tokens (W3C Design Tokens format). Figma Light and Dark modes are in $extensions["com.figma"].modes.',
    Primitives: { colour: ramps },
    Semantic: { colour: semantic },
    Type: typeTokens,
    Grid: grid,
    Spacing: spacing,
    Elevation: elevation,
    $extensions: { 'com.baseline': { typeUnit: isWeb(type.platform) ? 'web' : 'apple' } }
  }
}

export function figmaTokensJson(input: ExportInput): string {
  return JSON.stringify(buildFigmaTokens(input), null, 2) + '\n'
}

/** Number of tokens in the file, using the same counting as the CSS export. */
export function figmaTokenCount(doc: Json): number {
  let n = 0
  const walk = (node: unknown) => {
    if (node && typeof node === 'object') {
      if ('$value' in (node as Json)) n += 1
      else for (const [k, v] of Object.entries(node as Json)) if (!k.startsWith('$')) walk(v)
    }
  }
  for (const k of ['Primitives', 'Semantic', 'Type', 'Grid', 'Spacing', 'Elevation']) walk(doc[k])
  return n
}
