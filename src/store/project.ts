import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Standard } from '../lib/contrast'
import type { PreviewMode } from '../lib/chartTheme'
import { DEFAULT_CELL, DEFAULT_THRESHOLD } from '../lib/contrastGrid'
import {
  addLayer, addLevel, defaultElevationSettings, loadPreset, parseField, removeLayer, removeLevel, renameLevel, setLayerField,
  type ElevationPresetKey, type ElevationSettings, type LayerField
} from '../lib/elevation'
import { defaultSpacingSettings, initOn, type SpacingBase, type SpacingSettings } from '../lib/spacing'
import {
  BREAKPOINTS, GRID_PRESETS, clampColumns, clampGutter, defaultGridSettings,
  type BreakpointKey, type GridPresetKey, type GridSettings
} from '../lib/grid'
import {
  WEB_PRESETS, defaultTypeSettings, isWeb,
  type AppleStyle, type PlatformIndex, type PresetKey, type TypeSettings, type Unit, type ViewKey
} from '../lib/typeScale'
import { TOKEN_DEFS, overrideKey, type Mode, type PaletteRef } from '../lib/tokens'
import {
  DEFAULT_SECONDARY,
  defaultSettings,
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
  /** True briefly after the clipboard refused a copy. */
  copyFailed: boolean
  /** Remapped token values keyed "name|mode"; absent = default mapping. */
  tokenOverrides: Record<string, string>
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
  setTypeOverride: (name: string, patch: { lh?: number; tr?: number }) => void
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
  setSecondary: (value: string | null) => void
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
  reset: () => void
}

export type AppTheme = 'light' | 'dark'

/** First visit follows the operating system; after that the saved choice wins. */
function systemTheme(): AppTheme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

let copiedTimer: ReturnType<typeof setTimeout> | undefined

export const useProject = create<ProjectState>()(persist((set) => ({
  settings: defaultSettings(),
  side: 'brand',
  selected: { key: 'primary', index: 9 },
  copied: false,
  copyFailed: false,
  tokenOverrides: {},
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
      if (merged.lh === undefined && merged.tr === undefined) delete overrides[name]
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
  setSecondary: (value) => set((s) => ({ settings: { ...s.settings, secondary: value } })),
  setNeutralPreset: (preset) => set((s) => ({ settings: { ...s.settings, neutral: { ...s.settings.neutral, preset } } })),
  setNeutralEnabled: (enabled) => set((s) => ({ settings: { ...s.settings, neutral: { ...s.settings.neutral, enabled } } })),
  setSemanticEnabled: (enabled) => set((s) => ({ settings: { ...s.settings, semanticEnabled: enabled } })),
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
      const def = TOKEN_DEFS.find((d) => d.name === name)
      // Picking the default step again restores the default mapping.
      if (def && def[mode] === ref) delete next[overrideKey(name, mode)]
      else next[overrideKey(name, mode)] = ref
      return { tokenOverrides: next }
    }),
  reset: () =>
    set({
      settings: defaultSettings(),
      side: 'brand',
      selected: { key: 'primary', index: 9 },
      copied: false,
      copyFailed: false,
      tokenOverrides: {},
      openToken: null,
      pickerPalette: null,
      contrast: defaultContrast(),
      previewMode: 'light',
      unit: 'rem',
      type: defaultTypeSettings(),
      grid: defaultGridSettings(),
      spacing: defaultSpacingSettings(),
      elevation: defaultElevationSettings()
    })
}), {
  name: 'omni-project',
  version: 1,
  // Only the project data is saved, never the actions or transient UI such as the copied flash and open pickers.
  partialize: (s) => ({
    settings: s.settings,
    tokenOverrides: s.tokenOverrides,
    contrast: s.contrast,
    previewMode: s.previewMode,
    appTheme: s.appTheme,
    unit: s.unit,
    type: s.type,
    grid: s.grid,
    spacing: s.spacing,
    elevation: s.elevation
  })
}))

export { DEFAULT_SECONDARY }
