import { overrideKey, refOf, splitRef, type Cell, type Collection, type CollectionKind, type Mode, type System, type Theme, type VarType, type Variable } from './model'
import { rampSteps } from './recipes'

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
  const rampValue = new Map<string, string>()
  for (const r of system.recipes) {
    const steps = rampSteps(r, theme.ramps[r.id])
    r.steps.forEach((label, i) => rampValue.set(refOf(r.collection, `${r.family}/${label}`), `#${steps[i]}`))
  }

  // 2. cells: the system's own, a ramp's generated colour, or the theme's override
  const cellOf = (c: Collection, v: Variable, mode: Mode): { cell: Cell; overridden: boolean } => {
    const own = theme.overrides[overrideKey(c.name, v.path, mode.id)]
    if (own) return { cell: own, overridden: true }
    const generated = rampValue.get(refOf(c.name, v.path))
    if (generated !== undefined) return { cell: { value: generated }, overridden: false }
    return { cell: v.cells[mode.id] ?? v.cells[c.modes[0].id] ?? { value: '' }, overridden: false }
  }

  const index = new Map<string, { c: Collection; v: Variable }>()
  for (const c of system.collections) for (const v of c.variables) index.set(refOf(c.name, v.path), { c, v })

  const follow = (c: Collection, v: Variable, mode: Mode, depth: number): string | number => {
    const { cell } = cellOf(c, v, mode)
    if (cell.alias === undefined) return cell.value ?? ''
    if (depth > MAX_DEPTH) return ''
    const target = index.get(cell.alias)
    if (!target) return ''
    const tm = target.c.modes.find((m) => m.name === mode.name) ?? target.c.modes[0]
    return follow(target.c, target.v, tm, depth + 1)
  }

  const collections: ResolvedCollection[] = system.collections.map((c) => ({
    name: c.name,
    kind: c.kind,
    modes: c.modes,
    variables: c.variables.map((v) => ({
      collection: c.name,
      path: v.path,
      type: v.type,
      group: v.group,
      kind: v.kind,
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
