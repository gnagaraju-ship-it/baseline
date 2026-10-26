/**
 * Themes: named, complete sets of token styles and settings. The store keeps the active theme's data as its working
 * copy; this file holds the pure helpers around it.
 */
import { defaultSettings, type PaletteSettings } from './colour'
import { defaultElevationSettings, type ElevationSettings } from './elevation'
import { defaultGridSettings, type GridSettings } from './grid'
import { defaultSpacingSettings, type SpacingSettings } from './spacing'
import { defaultTypeSettings, type TypeSettings } from './typeScale'

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
    elevation: { ...d.elevation, ...(p.elevation ?? {}) }
  }
}

export const UNTITLED_NAME = 'Untitled'

/**
 * The Untitled UI system mapped onto what Baseline holds: its brand (Original, 600), status colours (Blue, Green, Yellow,
 * Orange and Red 600/500), Inter for headings and body at a 16px base, and its spacing scale (0 to 160). Its 11-step ramps,
 * radius, widths and containers have no place in Baseline and are not imported.
 */
export function untitledThemeData(): ThemeData {
  const d = defaultThemeData()
  d.settings.text = { primary: '#7F56D9', info: '#2563EB', success: '#16A34A', caution: '#EAB308', warning: '#EA580C', critical: '#DC2626' }
  d.settings.neutral = { enabled: true, preset: 'zinc' }
  d.type.headingFont = 'Inter'
  d.type.bodyFont = 'Inter'
  d.type.base = 16
  const steps = [0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128, 160]
  d.spacing.extra = [128, 160]
  d.spacing.on = { ...Object.fromEntries(Object.keys(d.spacing.on).map((k) => [k, false])), ...Object.fromEntries(steps.map((v) => [v, true])) }
  return d
}
