/**
 * One export for the whole system: every module's CSS in a single file, with a count of the tokens it holds.
 */
import { buildPalettes, toCss, tokenRows, type PaletteSettings } from './colour'
import { toElevationCss, type ElevationSettings } from './elevation'
import { toGridCss, type GridSettings } from './grid'
import { onValues, scaleSteps, spacingBreakpoints, spacingTokens, toSpacingCss, type SpacingSettings } from './spacing'
import { resolveAll, toTokenCss } from './tokens'
import { computeGroups, countRows, isWeb, toTypeCss, typeFonts, withGridBreakpoints, type TypeSettings } from './typeScale'

export interface ExportInput {
  settings: PaletteSettings
  tokenOverrides: Record<string, string>
  /** Opacity per "name|mode" token value. */
  tokenAlpha?: Record<string, number>
  type: TypeSettings
  grid: GridSettings
  spacing: SpacingSettings
  elevation: ElevationSettings
}

export type ExportModule = 'ramps' | 'semantic' | 'type' | 'grids' | 'spacing' | 'elevation'

export interface ExportSection { id: ExportModule; title: string; css: string; count: number }

export function exportSections(s: ExportInput): ExportSection[] {
  const palettes = buildPalettes(s.settings)
  const rows = tokenRows(palettes)
  const resolved = resolveAll(palettes, s.tokenOverrides, s.tokenAlpha)
  const type = withGridBreakpoints(s.type, s.grid.on.md, s.grid.on.xs)
  const typeGroups = computeGroups(type)
  const steps = scaleSteps(s.spacing.base, s.spacing.extra)
  const enabled = onValues(steps, s.spacing.on)
  const spaceGroups = spacingTokens(s.grid, spacingBreakpoints(s.spacing, s.grid), enabled)

  return [
    { id: 'ramps', title: 'Colour: palette ramps', css: toCss(rows), count: rows.length },
    { id: 'semantic', title: 'Colour: semantic tokens (light and dark)', css: toTokenCss(resolved.tokens), count: resolved.resolvedCount },
    { id: 'type', title: 'Type scale', css: toTypeCss(typeGroups, isWeb(type.platform), typeFonts(type)), count: countRows(typeGroups) },
    { id: 'grids', title: 'Grids', css: toGridCss(s.grid), count: Object.values(s.grid.on).filter(Boolean).length },
    { id: 'spacing', title: 'Spacing', css: toSpacingCss(enabled, spaceGroups), count: enabled.length },
    { id: 'elevation', title: 'Elevation', css: toElevationCss(s.elevation.tokens, s.elevation.shadow), count: s.elevation.tokens.length }
  ]
}

export function exportAll(s: ExportInput): { css: string; count: number } {
  const sections = exportSections(s)
  return {
    css: sections.map((x) => `/* ${x.title} */\n${x.css}`).join('\n\n') + '\n',
    count: sections.reduce((n, x) => n + x.count, 0)
  }
}
