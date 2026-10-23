/**
 * W3C Design Tokens (DTCG) export for Figma Variables, Tokens Studio and Style Dictionary.
 * Colours are hex, aliases are written "{Group.path.token}", and Figma's Light / Dark modes live in
 * $extensions["com.figma"].modes because the DTCG format has no modes of its own.
 */
import { buildPalettes, norm, withAlpha } from './colour'
import { computeGrid, BREAKPOINTS } from './grid'
import type { ExportInput } from './exportAll'
import { onValues, scaleSteps, spacingBreakpoints, spacingTokens } from './spacing'
import { ALPHA, resolveAll, type ResolvedCell } from './tokens'
import { computeGroups, isWeb, withGridBreakpoints } from './typeScale'

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

  const type = withGridBreakpoints(input.type, input.grid.on.md, input.grid.on.xs)
  const typeTokens: Json = {}
  for (const g of computeGroups(type)) {
    for (const r of g.rows) {
      typeTokens[r.name] = { size: dimension(r.size), 'line-height': dimension(r.lh), 'letter-spacing': { $type: 'number', $value: r.tr, $description: 'em' } }
      for (const v of r.variants) typeTokens[v.name] = { weight: { $type: 'fontWeight', $value: v.weight } }
    }
  }

  const grid: Json = {}
  for (const bp of BREAKPOINTS) {
    if (!input.grid.on[bp.key]) continue
    const l = computeGrid(input.grid, bp.key)
    grid[bp.key] = {
      width: dimension(bp.width), columns: { $type: 'number', $value: l.columns }, gutter: dimension(l.gutter),
      margin: dimension(l.margin), sidebar: dimension(l.sidebarWidth), column: dimension(l.column)
    }
  }

  const steps = scaleSteps(input.spacing.base, input.spacing.extra)
  const enabled = onValues(steps, input.spacing.on)
  const space: Json = {}
  for (const v of enabled) space[String(v)] = dimension(v)
  const spacing: Json = { space }
  for (const g of spacingTokens(input.grid, spacingBreakpoints(input.spacing, input.grid), enabled)) {
    for (const r of g.rows) {
      const perBp: Json = {}
      for (const c of r.cells) perBp[c.bp] = dimension(c.value)
      spacing[r.name] = perBp
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
    $description: 'Omni by Canvs design tokens (W3C Design Tokens format). Figma Light and Dark modes are in $extensions["com.figma"].modes.',
    Primitives: { colour: ramps },
    Semantic: { colour: semantic },
    Type: typeTokens,
    Grid: grid,
    Spacing: spacing,
    Elevation: elevation,
    $extensions: { 'com.omni': { typeUnit: isWeb(type.platform) ? 'web' : 'apple' } }
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
