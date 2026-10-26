/**
 * One export for the whole system: every module's CSS in a single file, with a count of the tokens it holds.
 */
import { importedSections, type ImportedSet } from './importedTokens'
import { colourSchema, tokenSchemaOf } from './schemas'
import { themeSlugs } from './themes'
import { buildPalettes, toCss, tokenRows, type PaletteSettings } from './colour'
import { toElevationCss, type ElevationSettings } from './elevation'
import { toGridCss, type GridSettings } from './grid'
import { typeByBreakpoint } from './responsive'
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
  /** Tokens kept as imported; when set they replace everything the generators above would make. */
  imported?: ImportedSet
  /** The colour schema the theme is built on; none means Baseline's own. */
  schemaId?: string
}

export type ExportModule = 'ramps' | 'semantic' | 'type' | 'grids' | 'spacing' | 'elevation'

export interface ExportSection { id: ExportModule; title: string; css: string; count: number }

export function exportSections(s: ExportInput): ExportSection[] {
  const colour = colourSchema(s.schemaId)
  const tokenSchema = tokenSchemaOf(colour)
  const palettes = buildPalettes(s.settings, colour)
  const rows = tokenRows(palettes, colour?.steps)
  const resolved = resolveAll(palettes, s.tokenOverrides, s.tokenAlpha, tokenSchema)
  const type = withGridBreakpoints(s.type, s.grid.on.md, s.grid.on.xs)
  const typeGroups = computeGroups(type)
  const steps = scaleSteps(s.spacing.base, s.spacing.extra)
  const enabled = onValues(steps, s.spacing.on)
  const spaceGroups = spacingTokens(s.grid, spacingBreakpoints(s.spacing, s.grid), enabled)

  const sections: ExportSection[] = [
    { id: 'ramps', title: 'Colour: palette ramps', css: toCss(rows), count: rows.length },
    { id: 'semantic', title: 'Colour: semantic tokens (light and dark)', css: toTokenCss(resolved.tokens, tokenSchema), count: resolved.resolvedCount },
    { id: 'type', title: 'Type scale', css: toTypeCss(typeGroups, isWeb(type.platform), typeFonts(type), typeByBreakpoint(s.type, s.grid)), count: countRows(typeGroups) },
    { id: 'grids', title: 'Grids', css: toGridCss(s.grid), count: Object.values(s.grid.on).filter(Boolean).length },
    { id: 'spacing', title: 'Spacing', css: toSpacingCss(enabled, spaceGroups), count: enabled.length },
    { id: 'elevation', title: 'Elevation', css: toElevationCss(s.elevation.tokens, s.elevation.shadow), count: s.elevation.tokens.length }
  ]
  // Grids and spacing kept as imported replace the generated ones; colours, type and elevation always come from the settings.
  if (!s.imported) return sections
  const kept = importedSections(s.imported)
  return sections.map((sec) => (sec.id === 'grids' || sec.id === 'spacing' ? kept.find((k) => k.id === sec.id)! : sec))
}

export function exportAll(s: ExportInput): { css: string; count: number } {
  const sections = exportSections(s)
  return {
    css: sections.map((x) => `/* ${x.title} */\n${x.css}`).join('\n\n') + '\n',
    count: sections.reduce((n, x) => n + x.count, 0)
  }
}

export interface NamedTheme { name: string; data: ExportInput }

/** Rewrites the root selectors of one theme's CSS. The first theme stays the default and also answers to :root. */
export function scopeCss(css: string, slug: string, isDefault: boolean): string {
  const brand = `[data-brand="${slug}"]`
  return css
    .replace(/^(\s*):root \{/gm, (_, ind) => `${ind}${isDefault ? `:root, ${brand}` : brand} {`)
    .replace(/^(\s*)(\[data-(?!brand=)[a-z-]+="[^"]+"\]) \{/gm, (_, ind, sel) => `${ind}${isDefault ? `${sel}, ${brand}${sel}` : `${brand}${sel}`} {`)
}

/** Sections for every theme. One theme gives exactly the plain sections; several are scoped by data-brand. */
export function themedSections(themes: NamedTheme[]): ExportSection[] {
  if (themes.length === 1) return exportSections(themes[0].data)
  const slugs = themeSlugs(themes)
  const per = themes.map((t) => exportSections(t.data))
  return per[0].map((sec, i) => ({
    id: sec.id,
    title: sec.title,
    css: per.flatMap((list, n) => (list[i].css ? [`/* Theme: ${themes[n].name} */\n${scopeCss(list[i].css, slugs[n], n === 0)}`] : [])).join('\n\n'),
    count: per.reduce((sum, list) => sum + list[i].count, 0)
  }))
}
