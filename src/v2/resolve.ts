import { overrideKey, refOf, splitRef, type Cell, type Collection, type CollectionKind, type Mode, type System, type Theme, type VarType, type Variable } from './model'
import { rampSteps } from './recipes'
import { stepPath, typeRows } from './typeScale'

export interface ResolvedCell {
  /** The value after following links. */
  value: string | number
  /** The variable it points at, when it is a link. */
  alias?: string
  overridden: boolean
}

export interface ResolvedVariable {
  collection: string
  path: string
  type: VarType
  group?: string
  kind?: Variable['kind']
  unit?: Variable['unit']
  cells: Record<string, ResolvedCell>
}

export interface ResolvedCollection { name: string; kind: CollectionKind; modes: Mode[]; variables: ResolvedVariable[] }

export interface ResolvedSystem {
  system: System
  theme: Theme
  collections: ResolvedCollection[]
  find: (ref: string) => ResolvedVariable | undefined
}

const MAX_DEPTH = 10

/** The system as the given theme sees it: ramps regenerated from their colours, overrides applied, links followed. */
export function resolveSystem(system: System, themeId: string): ResolvedSystem {
  const theme = system.themes.find((t) => t.id === themeId) ?? system.themes[0]

  // 1. the ramps of the recipes
  const rampValue = new Map<string, string | number>()
  for (const r of system.recipes) {
    const steps = rampSteps(r, theme.ramps[r.id])
    r.steps.forEach((label, i) => rampValue.set(refOf(r.collection, `${r.family}/${label}`), `#${steps[i]}`))
  }

  // 1b. the type of the system for the theme: sizes, line heights, tracking, weights and the two fonts
  if (system.type) {
    const t = system.type
    const set = (path: string | undefined, value: string | number) => path && rampValue.set(refOf(t.collection, path), value as string)
    set(t.paths.headingFont, theme.type?.headingFont ?? t.headingFont)
    set(t.paths.bodyFont, theme.type?.bodyFont ?? t.bodyFont)
    for (const r of typeRows(t, theme.type)) {
      set(stepPath(t, 'size', r.name), r.size)
      set(stepPath(t, 'line', r.name), r.lh)
      set(stepPath(t, 'track', r.name), r.tr)
      set(stepPath(t, 'weight', r.name), r.weight)
    }
  }

  // 2. cells: the system's own, a ramp's generated colour, or the theme's override
  const cellOf = (c: Collection, v: Variable, mode: Mode): { cell: Cell; overridden: boolean } => {
    const own = theme.overrides[overrideKey(c.name, v.path, mode.id)]
    if (own) return { cell: own, overridden: true }
    const generated = rampValue.get(refOf(c.name, v.path))
    if (generated !== undefined) return { cell: { value: generated }, overridden: false }
    return { cell: v.cells[mode.id] ?? v.cells['*'] ?? v.cells[c.modes[0].id] ?? { value: '' }, overridden: false }
  }

  // the system's collections with the variables the theme added
  const all: Collection[] = system.collections.map((c) => ({ ...c, variables: [...c.variables, ...(theme.added?.[c.name] ?? [])] }))
  const index = new Map<string, { c: Collection; v: Variable }>()
  for (const c of all) for (const v of c.variables) index.set(refOf(c.name, v.path), { c, v })

  const follow = (c: Collection, v: Variable, mode: Mode, depth: number): string | number => {
    const { cell } = cellOf(c, v, mode)
    if (cell.alias === undefined) return cell.value ?? ''
    if (depth > MAX_DEPTH) return ''
    const target = index.get(cell.alias)
    if (!target) return ''
    const tm = target.c.modes.find((m) => m.name === mode.name) ?? target.c.modes[0]
    return follow(target.c, target.v, tm, depth + 1)
  }

  const collections: ResolvedCollection[] = all.map((c) => ({
    name: c.name,
    kind: c.kind,
    modes: c.modes,
    variables: c.variables.map((v) => ({
      collection: c.name,
      path: v.path,
      type: v.type,
      group: v.group,
      kind: v.kind,
      unit: v.unit,
      cells: Object.fromEntries(
        c.modes.map((m) => {
          const { cell, overridden } = cellOf(c, v, m)
          return [m.id, { value: follow(c, v, m, 0), ...(cell.alias !== undefined ? { alias: cell.alias } : {}), overridden }]
        })
      )
    }))
  }))

  const byRef = new Map<string, ResolvedVariable>()
  for (const c of collections) for (const v of c.variables) byRef.set(refOf(c.name, v.path), v)
  return { system, theme, collections, find: (ref) => byRef.get(ref) }
}

export { splitRef }
