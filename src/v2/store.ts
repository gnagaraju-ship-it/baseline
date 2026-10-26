import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { clampAlpha, norm } from '../lib/colour'
import { emptyTheme, overrideKey, type Cell, type System, type Theme } from './model'
import { resolveSystem, type ResolvedSystem } from './resolve'
import { builtInSystems } from './systems'

export interface V2State {
  /** The themes of each system. A system starts with its own base theme. */
  themes: Record<string, Theme[]>
  activeSystemId: string
  activeThemeId: Record<string, string>
  /** The export dialog. */
  exportOpen: boolean
  openExport: () => void
  closeExport: () => void
  setSystem: (id: string) => void
  setTheme: (id: string) => void
  addTheme: (name?: string) => void
  renameTheme: (id: string, name: string) => void
  deleteTheme: (id: string) => void
  /** A new colour for a ramp ("" goes back to the system's own). */
  setRamp: (recipeId: string, hex: string) => void
  /** Point a semantic variable at another one, or give it a colour of its own; null goes back to the system's cell. */
  setCell: (collection: string, path: string, modeId: string, cell: Cell | null) => void
  /** An opacity for a colour cell, in percent. */
  setOpacity: (collection: string, path: string, modeId: string, percent: number, resolvedHex: string) => void
  resetTheme: () => void
}

let systems = builtInSystems()
/** The built-in systems, with the user's themes in place of their starting ones. */
export const systemsFor = (themes: Record<string, Theme[]>): System[] => systems.map((s) => ({ ...s, themes: themes[s.id] ?? s.themes }))

const initialThemes = (): Record<string, Theme[]> => Object.fromEntries(systems.map((s) => [s.id, s.themes.map((t) => ({ ...t, ramps: { ...t.ramps }, overrides: { ...t.overrides } }))]))
const initialActive = (): Record<string, string> => Object.fromEntries(systems.map((s) => [s.id, s.themes[0].id]))

const nextId = (themes: Theme[]) => {
  let n = themes.length + 1
  while (themes.some((t) => t.id === `theme-${n}`)) n++
  return `theme-${n}`
}
const uniqueName = (wanted: string, taken: string[]) => {
  const base = wanted.trim().replace(/\s+/g, ' ') || 'Theme'
  let name = base
  for (let n = 2; taken.some((x) => x.toLowerCase() === name.toLowerCase()); n++) name = `${base} ${n}`
  return name
}

export const useV2 = create<V2State>()(
  persist(
    (set, get) => {
      const edit = (change: (t: Theme) => Theme) =>
        set((s) => {
          const id = s.activeSystemId
          const list = s.themes[id] ?? []
          return { themes: { ...s.themes, [id]: list.map((t) => (t.id === s.activeThemeId[id] ? change(t) : t)) } }
        })
      return {
        themes: initialThemes(),
        activeSystemId: systems[0].id,
        activeThemeId: initialActive(),
        exportOpen: false,
        openExport: () => set({ exportOpen: true }),
        closeExport: () => set({ exportOpen: false }),
        setSystem: (id) => set(() => (systems.some((x) => x.id === id) ? { activeSystemId: id } : {})),
        setTheme: (id) => set((s) => (s.themes[s.activeSystemId]?.some((t) => t.id === id) ? { activeThemeId: { ...s.activeThemeId, [s.activeSystemId]: id } } : {})),
        addTheme: (name) =>
          set((s) => {
            const sys = s.activeSystemId
            const list = s.themes[sys]
            if (list.length >= 8) return {}
            const from = list.find((t) => t.id === s.activeThemeId[sys]) ?? list[0]
            const id = nextId(list)
            const copy: Theme = { ...emptyTheme(id, uniqueName(name ?? `${from.name} copy`, list.map((t) => t.name))), ramps: { ...from.ramps }, overrides: { ...from.overrides } }
            return { themes: { ...s.themes, [sys]: [...list, copy] }, activeThemeId: { ...s.activeThemeId, [sys]: id } }
          }),
        renameTheme: (id, name) =>
          set((s) => {
            const sys = s.activeSystemId
            const list = s.themes[sys]
            const clean = name.trim()
            if (!clean) return {}
            return { themes: { ...s.themes, [sys]: list.map((t) => (t.id === id ? { ...t, name: uniqueName(clean, list.filter((x) => x.id !== id).map((x) => x.name)) } : t)) } }
          }),
        deleteTheme: (id) =>
          set((s) => {
            const sys = s.activeSystemId
            const list = s.themes[sys]
            if (list.length < 2) return {}
            const left = list.filter((t) => t.id !== id)
            const active = s.activeThemeId[sys] === id ? left[0].id : s.activeThemeId[sys]
            return { themes: { ...s.themes, [sys]: left }, activeThemeId: { ...s.activeThemeId, [sys]: active } }
          }),
        setRamp: (recipeId, hex) =>
          edit((t) => {
            const ramps = { ...t.ramps }
            if (hex === '') delete ramps[recipeId]
            else ramps[recipeId] = hex
            return { ...t, ramps }
          }),
        setCell: (collection, path, modeId, cell) =>
          edit((t) => {
            const overrides = { ...t.overrides }
            const key = overrideKey(collection, path, modeId)
            if (cell === null) delete overrides[key]
            else overrides[key] = cell
            return { ...t, overrides }
          }),
        setOpacity: (collection, path, modeId, percent, resolvedHex) => {
          const p = clampAlpha(percent)
          const hex = norm(resolvedHex.slice(1, 7))
          if (!hex) return
          const a = Math.round((p / 100) * 255).toString(16).padStart(2, '0').toUpperCase()
          get().setCell(collection, path, modeId, p >= 100 ? null : { value: `#${hex}${a}` })
        },
        resetTheme: () => edit((t) => ({ ...t, ramps: {}, overrides: {} }))
      }
    },
    {
      name: 'baseline-v2',
      version: 1,
      partialize: (s) => ({ themes: s.themes, activeSystemId: s.activeSystemId, activeThemeId: s.activeThemeId }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<V2State>
        const themes = { ...current.themes }
        for (const [id, list] of Object.entries(p.themes ?? {})) if (themes[id] && Array.isArray(list) && list.length) themes[id] = list
        const activeSystemId = systems.some((x) => x.id === p.activeSystemId) ? p.activeSystemId! : current.activeSystemId
        const activeThemeId = { ...current.activeThemeId }
        for (const [id, t] of Object.entries(p.activeThemeId ?? {})) if (themes[id]?.some((x) => x.id === t)) activeThemeId[id] = t
        return { ...current, themes, activeSystemId, activeThemeId }
      }
    }
  )
)

/** The active system, as resolved for its active theme. */
export function activeResolved(s: Pick<V2State, 'themes' | 'activeSystemId' | 'activeThemeId'>): ResolvedSystem {
  const list = systemsFor(s.themes)
  const system = list.find((x) => x.id === s.activeSystemId) ?? list[0]
  return resolveSystem(system, s.activeThemeId[system.id] ?? system.themes[0].id)
}

export const v2Systems = () => systems
/** For tests: forget everything and start again. */
export function resetV2() {
  systems = builtInSystems()
  useV2.setState({ themes: initialThemes(), activeSystemId: systems[0].id, activeThemeId: initialActive(), exportOpen: false })
}
