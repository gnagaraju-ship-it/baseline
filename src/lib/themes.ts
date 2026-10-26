/**
 * Themes: named, complete sets of token styles and settings. The store keeps the active theme's data as its working
 * copy; this file holds the pure helpers around it.
 */
import untitledType from '../data/untitled-type.json'
import untitledUi from '../data/untitled-ui.json'
import { BREAKPOINTS_COLLECTION, makeResponsive, type ImportedSet } from './importedTokens'
import { UNTITLED_ID } from './schemas'
import { defaultSettings, type PaletteSettings } from './colour'
import { defaultElevationSettings, type ElevationSettings } from './elevation'
import { defaultGridSettings, type GridSettings } from './grid'
import { defaultSpacingSettings, type SpacingSettings } from './spacing'
import { defaultTypeSettings, type FixedStep, type TypeSettings } from './typeScale'

export const MAX_THEMES = 8

/** Everything that switches with a theme. */
export interface ThemeData {
  settings: PaletteSettings
  tokenOverrides: Record<string, string>
  tokenAlpha: Record<string, number>
  type: TypeSettings
  grid: GridSettings
  spacing: SpacingSettings
  elevation: ElevationSettings
  /** Tokens kept as imported. A theme with these uses them in place of everything above. */
  imported?: ImportedSet
  /** The colour schema (ramps, palettes, semantic tokens) the theme is built on; none means Baseline's own. */
  schemaId?: string
}

export interface Theme {
  id: string
  name: string
  data: ThemeData
}

export function defaultThemeData(): ThemeData {
  return {
    settings: defaultSettings(),
    tokenOverrides: {},
    tokenAlpha: {},
    type: defaultTypeSettings(),
    grid: defaultGridSettings(),
    spacing: defaultSpacingSettings(),
    elevation: defaultElevationSettings()
  }
}

export function cloneData(data: ThemeData): ThemeData {
  return JSON.parse(JSON.stringify(data)) as ThemeData
}

export function nextThemeId(themes: Theme[]): string {
  let n = themes.length + 1
  while (themes.some((t) => t.id === `theme-${n}`)) n += 1
  return `theme-${n}`
}

/** "Ocean" stays "Ocean" if free, otherwise "Ocean 2", "Ocean 3" ... Comparison ignores case and spacing. */
export function uniqueName(wanted: string, existing: string[]): string {
  const base = wanted.trim().replace(/\s+/g, ' ') || 'Theme'
  const taken = new Set(existing.map((n) => n.trim().toLowerCase()))
  if (!taken.has(base.toLowerCase())) return base
  let n = 2
  while (taken.has(`${base} ${n}`.toLowerCase())) n += 1
  return `${base} ${n}`
}

/** A CSS-safe name for a theme: "Ocean Blue" becomes "ocean-blue". */
export function slugify(name: string): string {
  const s = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s || 'theme'
}

/** One slug per theme, in order, each unique ("ocean", "ocean-2"). */
export function themeSlugs(themes: Array<{ name: string }>): string[] {
  const used = new Set<string>()
  return themes.map((t) => {
    const base = slugify(t.name)
    let slug = base
    let n = 2
    while (used.has(slug)) slug = `${base}-${n++}`
    used.add(slug)
    return slug
  })
}

/** Completes the data of an older or partial save with defaults. */
export function completeData(partial: Partial<ThemeData> | undefined): ThemeData {
  const d = defaultThemeData()
  const p = partial ?? {}
  return {
    settings: { ...d.settings, ...(p.settings ?? {}) },
    tokenOverrides: p.tokenOverrides ?? d.tokenOverrides,
    tokenAlpha: p.tokenAlpha ?? d.tokenAlpha,
    type: { ...d.type, ...(p.type ?? {}) },
    grid: { ...d.grid, ...(p.grid ?? {}) },
    spacing: { ...d.spacing, ...(p.spacing ?? {}) },
    elevation: { ...d.elevation, ...(p.elevation ?? {}) },
    ...(p.imported ? { imported: p.imported } : {}),
    ...(p.schemaId ? { schemaId: p.schemaId } : {})
  }
}

export const UNTITLED_NAME = 'Untitled'

/**
 * Untitled UI as it comes from its Figma files. Colours use the Untitled colour schema (editable ramps and tokens); the
 * collections that Baseline has no screen for yet (type, spacing, radius, widths, containers) are kept as imported.
 */
export function untitledThemeData(): ThemeData {
  const set = cloneImported(untitledUi as ImportedSet)
  set.collections = set.collections
    .filter((c) => c.name !== 'Brand palette' && c.name !== '1. Color modes' && c.name !== '6. Typography')
    .map((c) => (c.name === '_Primitives' ? { ...c, variables: c.variables.filter((v) => v.name.startsWith('Spacing/')) } : c))
  const type: TypeSettings = {
    ...defaultTypeSettings(),
    headingFont: untitledType.fonts.heading,
    bodyFont: untitledType.fonts.body,
    // Untitled has one size per step; scaling the headings down on smaller screens is left off until asked for.
    tablet: { on: false, pct: -8 },
    mobile: { on: false, pct: -15 },
    fixed: untitledType.steps as FixedStep[]
  }
  // Only the widths change by breakpoint (a value per breakpoint, equal to start with); the breakpoints themselves are made from them.
  set.collections = set.collections.map((c) => (c.name === '4. Widths' ? makeResponsive(c) : c))
  set.collections.push(breakpointsCollection())
  return { ...defaultThemeData(), type, imported: set, schemaId: UNTITLED_ID }
}

/** Which width token each breakpoint is made from, and the value that token has. */
export const BREAKPOINT_WIDTHS: Array<[string, string, number]> = [['breakpoint-xxl', 'width-4xl', 1440], ['breakpoint-md', 'width-xl', 768], ['breakpoint-xs', 'width-xs', 384]]

/** Where the layout changes: the widths the media queries use. Each follows a width token (XXL the 4xl, MD the xl, XS the xs). */
export const breakpointsCollection = () => ({
  name: BREAKPOINTS_COLLECTION,
  modes: ['Value'],
  variables: BREAKPOINT_WIDTHS.map(([name, width, v]) => ({ name, type: 'number' as const, scopes: ['ALL_SCOPES'], values: { Value: { v, a: `4. Widths::${width}` } } }))
})

const cloneImported = (set: ImportedSet): ImportedSet => JSON.parse(JSON.stringify(set))
