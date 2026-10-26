import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Standard } from '../lib/contrast'
import type { PreviewMode } from '../lib/chartTheme'
import { DEFAULT_CELL, DEFAULT_THRESHOLD } from '../lib/contrastGrid'
import {
  addLayer, addLevel, defaultElevationSettings, loadPreset, parseField, removeLayer, removeLevel, renameLevel, setLayerField,
  type ElevationPresetKey, type ElevationSettings, type LayerField
} from '../lib/elevation'
import type { ExportModule } from '../lib/exportAll'
import { ALL_MODULES, normaliseSelection, type ExportFormat } from '../lib/exportBuilder'
import { BREAKPOINTS_COLLECTION, makeResponsive, addImported, addNamedImported, setImportedOff as setOff, setImportedAlias, removeImported, renameImported, resetImported, setImportedValue, type ImportedSet } from '../lib/importedTokens'
import { cloneData, completeData, defaultThemeData, MAX_THEMES, nextThemeId, uniqueName, UNTITLED_NAME, untitledThemeData, breakpointsCollection, BREAKPOINT_WIDTHS, type Theme, type ThemeData } from '../lib/themes'
import { defaultSpacingSettings, initOn, type SpacingBase, type SpacingSettings } from '../lib/spacing'
import {
  BREAKPOINTS, GRID_PRESETS, clampColumns, clampGutter, defaultGridSettings,
  type BreakpointKey, type GridPresetKey, type GridSettings
} from '../lib/grid'
import {
  WEB_PRESETS, defaultTypeSettings, isWeb,
  type AppleStyle, type PlatformIndex, type PresetKey, type TypeSettings, type Unit, type ViewKey
} from '../lib/typeScale'
import { UNTITLED_ID, colourSchema, tokenSchemaOf } from '../lib/schemas'
import { overrideKey, type Mode, type PaletteRef } from '../lib/tokens'
import {
  DEFAULT_SECONDARY,
  MAX_UTILITY,
  clampAlpha,
  defaultSettings,
  defaultUtilityHex,
  nextUtilityId,
  type NeutralPreset,
  type PaletteKey,
  type PaletteSettings,
  type TextKey
} from '../lib/colour'

export type SideTab = 'brand' | 'tokens'

export interface ContrastState {
  palette: PaletteKey
  standard: Standard
  /** Selected minimum per standard (0 = All). */
  threshold: Record<Standard, number>
  /** [row, column] of the selected grid cell. */
  cell: [number, number]
}

function defaultContrast(): ContrastState {
  return { palette: 'primary', standard: 'apca', threshold: { ...DEFAULT_THRESHOLD }, cell: [DEFAULT_CELL[0], DEFAULT_CELL[1]] }
}

interface ProjectState {
  settings: PaletteSettings
  side: SideTab
  selected: { key: PaletteKey; index: number }
  copied: boolean
  /** The Export dialog: open or not, and what it will export. Not saved with the project. */
  exportDialog: { open: boolean; format: ExportFormat; modules: ExportModule[] }
  openExport: (modules?: ExportModule[]) => void
  closeExport: () => void
  setExportFormat: (format: ExportFormat) => void
  toggleExportModule: (module: ExportModule) => void
  setExportModules: (modules: ExportModule[]) => void
  /** True briefly after the clipboard refused a copy. */
  copyFailed: boolean
  /** Remapped token values keyed "name|mode"; absent = default mapping. */
  tokenOverrides: Record<string, string>
  /** Opacity in percent per "name|mode" token value; absent = 100. */
  tokenAlpha: Record<string, number>
  openToken: { name: string; mode: Mode } | null
  pickerPalette: PaletteRef | null
  contrast: ContrastState
  /** Theme of the tool itself (the UI preview has its own Light / Dark for the design system). */
  appTheme: AppTheme
  setAppTheme: (theme: AppTheme) => void
  previewMode: PreviewMode
  setPreviewMode: (mode: PreviewMode) => void
  /** Shared by Type, Grids and Spacing. */
  unit: Unit
  setUnit: (unit: Unit) => void
  type: TypeSettings
  setTypePlatform: (platform: PlatformIndex) => void
  setTypeBase: (base: number) => void
  setTypeRatio: (ratio: number) => void
  setTypeGrid: (grid: number) => void
  applyTypePreset: (preset: PresetKey) => void
  setAppleStyle: (style: AppleStyle) => void
  setTypeFont: (which: 'headingFont' | 'bodyFont', font: string) => void
  setResponsive: (which: 'tablet' | 'mobile', patch: Partial<{ on: boolean; pct: number }>) => void
  setTypeView: (view: ViewKey) => void
  toggleVariant: (name: string, weight: number) => void
  setTypeOverride: (name: string, patch: { lh?: number; tr?: number; size?: number }) => void
  resetTypeOverride: (name: string) => void
  grid: GridSettings
  setGridPlatform: (platform: number) => void
  toggleGridFlag: (flag: 'sidebar' | 'floating' | 'maxWidth') => void
  applyGridPreset: (preset: GridPresetKey) => void
  toggleBreakpoint: (key: BreakpointKey) => void
  setActiveBreakpoint: (key: BreakpointKey) => void
  setGridColumns: (n: number) => void
  setGridGutter: (n: number) => void
  spacing: SpacingSettings
  setSpacingBase: (base: SpacingBase) => void
  toggleSpacingStep: (value: number) => void
  addSpacingValue: (value: number) => void
  setSpacingSame: (same: boolean) => void
  toggleSpacingBreakpoint: (key: BreakpointKey) => void
  elevation: ElevationSettings
  /** Tokens kept as imported, when the active theme is an imported set. */
  imported?: ImportedSet
  /** The colour schema of the active theme; none means Baseline's own. */
  schemaId?: string
  /** Type a colour for a palette of the schema (raw text; invalid text keeps the starting colour). */
  setPaletteHex: (key: string, text: string) => void
  /** Edit the tokens kept as imported: a value, a name, add, remove, or back to what was imported. */
  setImportedValue: (collection: string, name: string, mode: string, value: number) => void
  renameImportedVariable: (collection: string, from: string, to: string) => void
  addImportedVariable: (collection: string) => void
  setImportedOff: (collection: string, name: string, off: boolean) => void
  addNamedImportedVariable: (collection: string, name: string, value: number) => void
  setImportedAlias: (collection: string, name: string, mode: string, target: string) => void
  removeImportedVariable: (collection: string, name: string) => void
  resetImportedCollection: (collection: string) => void
  applyElevationPreset: (preset: ElevationPresetKey) => void
  setShadowColour: (text: string) => void
  renameElevation: (i: number, text: string) => void
  removeElevation: (i: number) => void
  addElevation: () => void
  addElevationLayer: (i: number) => void
  removeElevationLayer: (i: number, j: number) => void
  setElevationField: (i: number, j: number, field: LayerField, text: string) => void
  setContrastPalette: (palette: PaletteKey) => void
  setContrastStandard: (standard: Standard) => void
  setContrastThreshold: (min: number) => void
  selectContrastCell: (row: number, col: number) => void
  setText: (key: TextKey, value: string) => void
  setAlpha: (key: string, percent: number) => void
  setSecondary: (value: string | null) => void
  setTertiary: (value: string | null) => void
  addUtility: () => void
  setUtilityHex: (id: number, value: string) => void
  renameUtility: (id: number, name: string) => void
  removeUtility: (id: number) => void
  setNeutralPreset: (preset: NeutralPreset) => void
  setNeutralEnabled: (enabled: boolean) => void
  setSemanticEnabled: (enabled: boolean) => void
  setSide: (side: SideTab) => void
  select: (key: PaletteKey, index: number) => void
  flashCopied: (ok?: boolean) => void
  openPicker: (name: string, mode: Mode, palette: PaletteRef) => void
  closePicker: () => void
  setPickerPalette: (palette: PaletteRef) => void
  setTokenOverride: (name: string, mode: Mode, ref: string) => void
  setTokenAlpha: (name: string, mode: Mode, percent: number) => void
  /** Named themes. The top-level fields are the working copy of the active one. */
  themes: Theme[]
  activeThemeId: string
  createTheme: (name?: string) => void
  duplicateTheme: (id: string) => void
  renameTheme: (id: string, name: string) => void
  deleteTheme: (id: string) => void
  switchTheme: (id: string) => void
  /** Puts the active theme back to the Baseline defaults. */
  resetTheme: () => void
  /** Everything back to a single default theme. */
  reset: () => void
}

type Working = Pick<ProjectState, 'settings' | 'tokenOverrides' | 'tokenAlpha' | 'type' | 'grid' | 'spacing' | 'elevation' | 'imported' | 'schemaId'>

/** The theme data currently being edited. */
export const pickData = (s: Working): ThemeData => ({
  settings: s.settings, tokenOverrides: s.tokenOverrides, tokenAlpha: s.tokenAlpha, type: s.type, grid: s.grid, spacing: s.spacing, elevation: s.elevation,
  ...(s.imported ? { imported: s.imported } : {}),
  ...(s.schemaId ? { schemaId: s.schemaId } : {})
})

/** Every theme with the active one brought up to date from the working copy. */
export function currentThemes(s: Working & { themes: Theme[]; activeThemeId: string }): Theme[] {
  return s.themes.map((t) => (t.id === s.activeThemeId ? { ...t, data: pickData(s) } : t))
}

/** What switching to a theme changes: its data, plus the view state that must not point at the old theme. */
const loadTheme = (data: ThemeData) => ({ ...data, imported: data.imported, schemaId: data.schemaId, openToken: null, pickerPalette: null, selected: { key: 'primary' as PaletteKey, index: 9 } })

export type AppTheme = 'light' | 'dark'

/** First visit follows the operating system; after that the saved choice wins. */
function systemTheme(): AppTheme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/** The app was called Omni by Canvs before it became Baseline; keep saved projects from that time. */
export function migrateOldStorage(storage: Storage = localStorage): void {
  try {
    const old = storage.getItem('omni-project')
    if (old !== null && storage.getItem('baseline-project') === null) storage.setItem('baseline-project', old)
    if (old !== null) storage.removeItem('omni-project')
  } catch {
    // Storage can be blocked; the app then simply starts from its defaults.
  }
}
migrateOldStorage()

let copiedTimer: ReturnType<typeof setTimeout> | undefined

export const useProject = create<ProjectState>()(persist((set) => ({
  settings: defaultSettings(),
  side: 'brand',
  selected: { key: 'primary', index: 9 },
  copied: false,
  copyFailed: false,
  exportDialog: { open: false, format: 'css', modules: ALL_MODULES },
  openExport: (modules = ALL_MODULES) => set((s) => ({ exportDialog: { ...s.exportDialog, open: true, modules: normaliseSelection(modules) } })),
  closeExport: () => set((s) => ({ exportDialog: { ...s.exportDialog, open: false } })),
  setExportFormat: (format) => set((s) => ({ exportDialog: { ...s.exportDialog, format } })),
  toggleExportModule: (module) =>
    set((s) => {
      const has = s.exportDialog.modules.includes(module)
      const next = has ? s.exportDialog.modules.filter((m) => m !== module) : [...s.exportDialog.modules, module]
      return { exportDialog: { ...s.exportDialog, modules: normaliseSelection(next) } }
    }),
  setExportModules: (modules) => set((s) => ({ exportDialog: { ...s.exportDialog, modules: normaliseSelection(modules) } })),
  tokenOverrides: {},
  tokenAlpha: {},
  openToken: null,
  pickerPalette: null,
  contrast: defaultContrast(),
  appTheme: systemTheme(),
  setAppTheme: (appTheme) => set({ appTheme }),
  previewMode: 'light',
  setPreviewMode: (previewMode) => set({ previewMode }),
  unit: 'rem',
  setUnit: (unit) => set({ unit }),
  type: defaultTypeSettings(),
  setTypePlatform: (platform) =>
    set((s) => ({ type: { ...s.type, platform, variants: {}, overrides: {} }, unit: isWeb(platform) ? 'rem' : 'pt' })),
  setTypeBase: (base) => set((s) => ({ type: { ...s.type, base: Math.max(10, Math.min(24, Math.round(base))), preset: null } })),
  setTypeRatio: (ratio) => set((s) => ({ type: { ...s.type, ratio, preset: null } })),
  setTypeGrid: (grid) => set((s) => ({ type: { ...s.type, grid, preset: null } })),
  applyTypePreset: (preset) =>
    set((s) => ({ type: { ...s.type, preset, base: WEB_PRESETS[preset].base, ratio: WEB_PRESETS[preset].ratio, grid: WEB_PRESETS[preset].grid, overrides: {} } })),
  setAppleStyle: (apple) => set((s) => ({ type: { ...s.type, apple, overrides: {} } })),
  setTypeFont: (which, font) => set((s) => ({ type: { ...s.type, [which]: font } })),
  setResponsive: (which, patch) => set((s) => ({ type: { ...s.type, [which]: { ...s.type[which], ...patch } } })),
  setTypeView: (view) => set((s) => ({ type: { ...s.type, view } })),
  toggleVariant: (name, weight) =>
    set((s) => {
      const cur = s.type.variants[name] ?? []
      const next = cur.includes(weight) ? cur.filter((w) => w !== weight) : [...cur, weight].sort((a, b) => a - b)
      const variants = { ...s.type.variants }
      if (next.length) variants[name] = next
      else delete variants[name]
      return { type: { ...s.type, variants } }
    }),
  setTypeOverride: (name, patch) =>
    set((s) => {
      const merged = { ...s.type.overrides[name], ...patch }
      const overrides = { ...s.type.overrides }
      if (merged.lh === undefined && merged.tr === undefined && merged.size === undefined) delete overrides[name]
      else overrides[name] = merged
      return { type: { ...s.type, overrides } }
    }),
  grid: defaultGridSettings(),
  setGridPlatform: (platform) => set((s) => ({ grid: { ...s.grid, platform } })),
  toggleGridFlag: (flag) => set((s) => ({ grid: { ...s.grid, [flag]: !s.grid[flag] } })),
  applyGridPreset: (preset) =>
    set((s) => {
      if (preset === 'custom') return { grid: { ...s.grid, preset } }
      const [xxl, md, xs] = GRID_PRESETS[preset].g
      return { grid: { ...s.grid, preset, gutter: { xxl, md, xs } } }
    }),
  toggleBreakpoint: (key) =>
    set((s) => {
      const on = { ...s.grid.on, [key]: !s.grid.on[key] }
      // The last enabled breakpoint cannot be turned off.
      if (!BREAKPOINTS.some((b) => on[b.key])) return {}
      const active = on[s.grid.active] ? s.grid.active : BREAKPOINTS.find((b) => on[b.key])!.key
      return { grid: { ...s.grid, on, active } }
    }),
  setActiveBreakpoint: (active) => set((s) => ({ grid: { ...s.grid, active } })),
  setGridColumns: (n) => set((s) => ({ grid: { ...s.grid, columns: { ...s.grid.columns, [s.grid.active]: clampColumns(n) } } })),
  spacing: defaultSpacingSettings(),
  setSpacingBase: (base) => set((s) => ({ spacing: { ...s.spacing, base, on: initOn(base), extra: [] } })),
  toggleSpacingStep: (value) => set((s) => ({ spacing: { ...s.spacing, on: { ...s.spacing.on, [value]: !s.spacing.on[value] } } })),
  addSpacingValue: (value) =>
    set((s) => ({
      spacing: { ...s.spacing, extra: s.spacing.extra.includes(value) ? s.spacing.extra : [...s.spacing.extra, value], on: { ...s.spacing.on, [value]: true } }
    })),
  setSpacingSame: (same) => set((s) => ({ spacing: { ...s.spacing, same } })),
  toggleSpacingBreakpoint: (key) => set((s) => ({ spacing: { ...s.spacing, bp: { ...s.spacing.bp, [key]: !s.spacing.bp[key] } } })),
  elevation: defaultElevationSettings(),
  applyElevationPreset: (preset) => set((s) => ({ elevation: { ...s.elevation, preset, tokens: loadPreset(preset) } })),
  setShadowColour: (shadow) => set((s) => ({ elevation: { ...s.elevation, shadow } })),
  renameElevation: (i, text) => set((s) => ({ elevation: { ...s.elevation, tokens: renameLevel(s.elevation.tokens, i, text) } })),
  removeElevation: (i) => set((s) => ({ elevation: { ...s.elevation, tokens: removeLevel(s.elevation.tokens, i) } })),
  addElevation: () => set((s) => ({ elevation: { ...s.elevation, tokens: addLevel(s.elevation.tokens) } })),
  addElevationLayer: (i) => set((s) => ({ elevation: { ...s.elevation, tokens: addLayer(s.elevation.tokens, i) } })),
  removeElevationLayer: (i, j) => set((s) => ({ elevation: { ...s.elevation, tokens: removeLayer(s.elevation.tokens, i, j) } })),
  setElevationField: (i, j, field, text) =>
    set((s) => ({ elevation: { ...s.elevation, tokens: setLayerField(s.elevation.tokens, i, j, field, parseField(field, text)) } })),
  setGridGutter: (n) => set((s) => ({ grid: { ...s.grid, preset: 'custom', gutter: { ...s.grid.gutter, [s.grid.active]: clampGutter(n) } } })),
  resetTypeOverride: (name) =>
    set((s) => {
      const overrides = { ...s.type.overrides }
      delete overrides[name]
      return { type: { ...s.type, overrides } }
    }),
  setContrastPalette: (palette) => set((s) => ({ contrast: { ...s.contrast, palette } })),
  setContrastStandard: (standard) => set((s) => ({ contrast: { ...s.contrast, standard } })),
  setContrastThreshold: (min) =>
    set((s) => ({ contrast: { ...s.contrast, threshold: { ...s.contrast.threshold, [s.contrast.standard]: min } } })),
  selectContrastCell: (row, col) => set((s) => ({ contrast: { ...s.contrast, cell: [row, col] } })),
  setText: (key, value) => set((s) => ({ settings: { ...s.settings, text: { ...s.settings.text, [key]: value } } })),
  setAlpha: (key, percent) =>
    set((s) => {
      const alpha = { ...s.settings.alpha }
      if (clampAlpha(percent) >= 100) delete alpha[key]
      else alpha[key] = clampAlpha(percent)
      return { settings: { ...s.settings, alpha } }
    }),
  setSecondary: (value) => set((s) => ({ settings: { ...s.settings, secondary: value } })),
  setTertiary: (value) => set((s) => ({ settings: { ...s.settings, tertiary: value } })),
  addUtility: () =>
    set((s) => {
      if (s.settings.utility.length >= MAX_UTILITY) return {}
      const id = nextUtilityId(s.settings.utility)
      const utility = [...s.settings.utility, { id, name: `Utility ${id}`, hex: '#' + defaultUtilityHex(id).toLowerCase() }].sort((a, b) => a.id - b.id)
      return { settings: { ...s.settings, utility } }
    }),
  setUtilityHex: (id, hex) => set((s) => ({ settings: { ...s.settings, utility: s.settings.utility.map((u) => (u.id === id ? { ...u, hex } : u)) } })),
  renameUtility: (id, name) => set((s) => ({ settings: { ...s.settings, utility: s.settings.utility.map((u) => (u.id === id ? { ...u, name } : u)) } })),
  removeUtility: (id) => set((s) => ({ settings: { ...s.settings, utility: s.settings.utility.filter((u) => u.id !== id) } })),
  setNeutralPreset: (preset) => set((s) => ({ settings: { ...s.settings, neutral: { ...s.settings.neutral, preset } } })),
  setNeutralEnabled: (enabled) => set((s) => ({ settings: { ...s.settings, neutral: { ...s.settings.neutral, enabled } } })),
  setSemanticEnabled: (enabled) => set((s) => ({ settings: { ...s.settings, semanticEnabled: enabled } })),
  setPaletteHex: (key, text) => set((s) => ({ settings: { ...s.settings, hex: { ...(s.settings.hex ?? {}), [key]: text } } })),
  setImportedValue: (collection, name, mode, value) => set((s) => (s.imported ? { imported: setImportedValue(s.imported, collection, name, mode, value) } : {})),
  renameImportedVariable: (collection, from, to) => set((s) => (s.imported ? { imported: renameImported(s.imported, collection, from, to) } : {})),
  addImportedVariable: (collection) => set((s) => (s.imported ? { imported: addImported(s.imported, collection) } : {})),
  setImportedOff: (collection, name, off) => set((s) => (s.imported ? { imported: setOff(s.imported, collection, name, off) } : {})),
  addNamedImportedVariable: (collection, name, value) => set((s) => (s.imported ? { imported: addNamedImported(s.imported, collection, name, value) } : {})),
  setImportedAlias: (collection, name, mode, target) => set((s) => (s.imported ? { imported: setImportedAlias(s.imported, collection, name, mode, target) } : {})),
  removeImportedVariable: (collection, name) => set((s) => (s.imported ? { imported: removeImported(s.imported, collection, name) } : {})),
  resetImportedCollection: (collection) => set((s) => (s.imported ? { imported: resetImported(s.imported, untitledThemeData().imported!, collection) } : {})),
  setSide: (side) => set({ side }),
  select: (key, index) => set({ selected: { key, index } }),
  flashCopied: (ok = true) => {
    set({ copied: ok, copyFailed: !ok })
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => set({ copied: false, copyFailed: false }), 1600)
  },
  openPicker: (name, mode, palette) => set({ openToken: { name, mode }, pickerPalette: palette }),
  closePicker: () => set({ openToken: null, pickerPalette: null }),
  setPickerPalette: (palette) => set({ pickerPalette: palette }),
  setTokenOverride: (name, mode, ref) =>
    set((s) => {
      const next = { ...s.tokenOverrides }
      const def = tokenSchemaOf(colourSchema(s.schemaId)).defs.find((d) => d.name === name)
      // Picking the default step again restores the default mapping.
      if (def && def[mode] === ref) delete next[overrideKey(name, mode)]
      else next[overrideKey(name, mode)] = ref
      return { tokenOverrides: next }
    }),
  setTokenAlpha: (name, mode, percent) =>
    set((s) => {
      const next = { ...s.tokenAlpha }
      if (clampAlpha(percent) >= 100) delete next[overrideKey(name, mode)]
      else next[overrideKey(name, mode)] = clampAlpha(percent)
      return { tokenAlpha: next }
    }),
  themes: [{ id: 'theme-1', name: 'Default', data: defaultThemeData() }],
  activeThemeId: 'theme-1',
  createTheme: (name) =>
    set((s) => {
      if (s.themes.length >= MAX_THEMES) return {}
      const saved = currentThemes(s)
      const id = nextThemeId(saved)
      const theme: Theme = { id, name: uniqueName(name?.trim() || `Theme ${saved.length + 1}`, saved.map((t) => t.name)), data: defaultThemeData() }
      return { themes: [...saved, theme], activeThemeId: id, ...loadTheme(theme.data) }
    }),
  duplicateTheme: (id) =>
    set((s) => {
      if (s.themes.length >= MAX_THEMES) return {}
      const saved = currentThemes(s)
      const from = saved.find((t) => t.id === id)
      if (!from) return {}
      const copy: Theme = { id: nextThemeId(saved), name: uniqueName(`${from.name} copy`, saved.map((t) => t.name)), data: cloneData(from.data) }
      return { themes: [...saved, copy], activeThemeId: copy.id, ...loadTheme(copy.data) }
    }),
  renameTheme: (id, name) =>
    set((s) => {
      const saved = currentThemes(s)
      const wanted = name.trim()
      if (!wanted) return {}
      const others = saved.filter((t) => t.id !== id).map((t) => t.name)
      return { themes: saved.map((t) => (t.id === id ? { ...t, name: uniqueName(wanted, others) } : t)) }
    }),
  deleteTheme: (id) =>
    set((s) => {
      if (s.themes.length <= 1) return {}
      const saved = currentThemes(s)
      const left = saved.filter((t) => t.id !== id)
      if (id !== s.activeThemeId) return { themes: left }
      return { themes: left, activeThemeId: left[0].id, ...loadTheme(left[0].data) }
    }),
  switchTheme: (id) =>
    set((s) => {
      if (id === s.activeThemeId) return {}
      const saved = currentThemes(s)
      const target = saved.find((t) => t.id === id)
      if (!target) return {}
      return { themes: saved, activeThemeId: id, ...loadTheme(target.data) }
    }),
  // An imported theme goes back to the tokens it was imported with.
  resetTheme: () => set((s) => ({ ...loadTheme(s.schemaId || s.imported ? untitledThemeData() : defaultThemeData()) })),
  reset: () =>
    set({
      themes: [{ id: 'theme-1', name: 'Default', data: defaultThemeData() }],
      activeThemeId: 'theme-1',
      settings: defaultSettings(),
      side: 'brand',
      selected: { key: 'primary', index: 9 },
      copied: false,
      copyFailed: false,
      exportDialog: { open: false, format: 'css', modules: ALL_MODULES },
      tokenOverrides: {},
      tokenAlpha: {},
      openToken: null,
      pickerPalette: null,
      contrast: defaultContrast(),
      previewMode: 'light',
      unit: 'rem',
      type: defaultTypeSettings(),
      grid: defaultGridSettings(),
      spacing: defaultSpacingSettings(),
      elevation: defaultElevationSettings(),
      imported: undefined,
      schemaId: undefined
    })
}), {
  name: 'baseline-project',
  version: 9,
  // Version 2 added tertiary and utility colours and version 3 themes: older saves are completed with defaults, and a
  // project saved before themes becomes one theme named "Default". Version 4 adds the Untitled theme next to it.
  migrate: (persisted, version) => {
    const p = (persisted ?? {}) as Record<string, any>
    if (version >= 9) return p as never
    if (version === 8 && Array.isArray(p.themes)) return { ...p, themes: p.themes.map(breakpointsFromWidths) } as never
    if (version === 7 && Array.isArray(p.themes)) return { ...p, themes: p.themes.map(addBreakpoints) } as never
    if (version === 6 && Array.isArray(p.themes)) return { ...p, themes: p.themes.map(upgradeUntitled) } as never
    if (version === 5 && Array.isArray(p.themes)) return { ...p, themes: p.themes.map(importUntitled) } as never
    if (version === 4 && Array.isArray(p.themes)) return { ...p, themes: p.themes.map(importUntitled) } as never
    if (version === 3 && Array.isArray(p.themes)) return { ...p, themes: withUntitled(p.themes) } as never
    const data = completeData({
      settings: p.settings, tokenOverrides: p.tokenOverrides, tokenAlpha: p.tokenAlpha, type: p.type, grid: p.grid, spacing: p.spacing, elevation: p.elevation
    })
    return { contrast: p.contrast, previewMode: p.previewMode, appTheme: p.appTheme, unit: p.unit, themes: withUntitled([{ id: 'theme-1', name: 'Default', data }]), activeThemeId: 'theme-1' } as never
  },
  // The saved state keeps the active theme's data inside `themes`; the working copy is rebuilt from it on load.
  merge: (persisted, current) => {
    const p = (persisted ?? {}) as Record<string, any>
    const themes: Theme[] = Array.isArray(p.themes) && p.themes.length
      ? p.themes.map((t: Theme) => ({ id: t.id, name: t.name, data: completeData(t.data) }))
      : current.themes
    const activeThemeId = themes.some((t) => t.id === p.activeThemeId) ? p.activeThemeId : themes[0].id
    const active = themes.find((t) => t.id === activeThemeId)!
    return { ...current, contrast: p.contrast ?? current.contrast, previewMode: p.previewMode ?? current.previewMode, appTheme: p.appTheme ?? current.appTheme, unit: p.unit ?? current.unit, themes, activeThemeId, ...active.data }
  },
  // Only project data is saved, never the actions or transient UI such as the copied flash and open pickers.
  partialize: (s) => ({
    themes: currentThemes(s),
    activeThemeId: s.activeThemeId,
    contrast: s.contrast,
    previewMode: s.previewMode,
    appTheme: s.appTheme,
    unit: s.unit
  })
}))

/** Older saves kept Untitled as a mapping onto Baseline's generators (4) or as read-only imported tokens (5). If never edited, it becomes the current Untitled. */
function importUntitled(t: Theme): Theme {
  const d = t.data
  const mapped = !d.imported && d.settings?.text?.primary === '#7F56D9' && d.type?.headingFont === 'Inter' && d.type?.base === 16
  // Version 5 kept all 8 files as read-only imported tokens; the colours are now an editable schema.
  const readOnly = !!d.imported && !d.schemaId && d.imported.collections.some((c) => c.name === '1. Color modes')
  return t.name === UNTITLED_NAME && (mapped || readOnly) ? { ...t, data: untitledThemeData() } : t
}

/** Version 8 gave Untitled plain breakpoint widths (1400, 768, 390): unless they were changed, they now come from the width tokens. */
function breakpointsFromWidths(t: Theme): Theme {
  const set = t.data?.imported
  const bp = set?.collections.find((c) => c.name === BREAKPOINTS_COLLECTION)
  if (t.data?.schemaId !== UNTITLED_ID || !set || !bp) return t
  const plain = [['breakpoint-xxl', 1400], ['breakpoint-md', 768], ['breakpoint-xs', 390]]
  const untouched = plain.every(([n, v]) => { const x = bp.variables.find((y) => y.name === n)?.values.Value; return x && !x.a && x.v === v })
  const hasWidths = BREAKPOINT_WIDTHS.every(([, w]) => set.collections.find((c) => c.name === '4. Widths')?.variables.some((v) => v.name === w))
  if (!untouched || !hasWidths) return t
  return { ...t, data: { ...t.data, imported: { collections: set.collections.map((c) => (c.name === BREAKPOINTS_COLLECTION ? breakpointsCollection() : c)) } } }
}

/** Version 7 Untitled has one value per spacing token, width and container: give them XXL, MD and XS (equal), keeping every edit, and add the breakpoint widths. */
function addBreakpoints(t: Theme): Theme {
  const set = t.data?.imported
  if (t.data?.schemaId !== UNTITLED_ID || !set || set.collections.some((c) => c.name === BREAKPOINTS_COLLECTION)) return t
  const collections = set.collections.map((c) => (['3. Spacing', '4. Widths', '5. Containers'].includes(c.name) ? makeResponsive(c) : c))
  return { ...t, data: { ...t.data, imported: { collections: [...collections, breakpointsCollection()] } } }
}

/** Version 6 Untitled has no named type steps: add them (and the trimmed imported set) and keep everything the user edited. */
function upgradeUntitled(t: Theme): Theme {
  if (t.data?.schemaId !== UNTITLED_ID || t.data.type?.fixed) return t
  const fresh = untitledThemeData()
  return { ...t, data: { ...t.data, type: fresh.type, imported: fresh.imported } }
}

/** Adds the Untitled theme after the saved ones, unless one with that name exists or there is no room. */
function withUntitled(themes: Theme[]): Theme[] {
  if (themes.length >= MAX_THEMES || themes.some((t) => t.name.trim().toLowerCase() === UNTITLED_NAME.toLowerCase())) return themes
  return [...themes, { id: nextThemeId(themes), name: UNTITLED_NAME, data: untitledThemeData() }]
}

export { DEFAULT_SECONDARY }
