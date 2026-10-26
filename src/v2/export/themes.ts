import { scopeCss } from '../../lib/exportAll'
import { importedDoc, type ImportedCollection, type ImportedSet, type ImportedValue } from '../../lib/importedTokens'
import { themeSlugs } from '../../lib/themes'
import type { System } from '../model'
import { resolveSystem, type ResolvedCell, type ResolvedCollection, type ResolvedSystem } from '../resolve'
import { ELEVATION, systemCss } from './css'
import { elevationDoc, systemSet } from './json'

/** The themes of a system, each resolved. `ids` picks some of them (all when left out). */
export function resolveThemes(system: System, ids?: string[]): ResolvedSystem[] {
  const list = system.themes.filter((t) => !ids || ids.includes(t.id))
  return (list.length ? list : system.themes.slice(0, 1)).map((t) => resolveSystem(system, t.id))
}

/** What a cell holds for comparing: the link when it is one (themes may differ below it), else the value. */
const signature = (c: ResolvedCell | undefined) => (c ? (c.alias !== undefined ? `@${c.alias}` : `=${c.value}`) : '')

/** True when the themes do not hold the same cells in this collection. */
function differs(rs: ResolvedSystem[], name: string): boolean {
  const cols = rs.map((r) => r.collections.find((c) => c.name === name)!)
  const first = cols[0]
  return cols.slice(1).some((c) => {
    if (c.variables.length !== first.variables.length) return true
    return c.variables.some((v, i) => v.path !== first.variables[i].path || first.modes.some((m) => signature(v.cells[m.id]) !== signature(first.variables[i].cells[m.id])))
  })
}

/**
 * The themes as Figma modes. A collection whose cells are the same in every theme keeps its own modes; one that
 * differs gets a mode per theme ("Ocean"), or per theme and mode ("Ocean / Dark") when it has several.
 */
export function themesSet(rs: ResolvedSystem[], only?: string[]): ImportedSet {
  if (rs.length < 2) return systemSet(rs[0], only)
  const names = rs.map((r) => r.theme.name)
  const collections: ImportedCollection[] = rs[0].collections
    .filter((c) => !only || only.includes(c.name))
    .map((c) => {
      if (!differs(rs, c.name)) return systemSet(rs[0], [c.name]).collections[0]
      const cols = rs.map((r) => r.collections.find((x) => x.name === c.name)!)
      const label = (t: number, m: ResolvedCollection['modes'][number]) => (c.modes.length > 1 ? `${names[t]} / ${m.name}` : names[t])
      // every path any theme has, in the order they first appear
      const paths = [...new Set(cols.flatMap((x) => x.variables.map((v) => v.path)))]
      return {
        name: c.name,
        modes: cols.flatMap((_, t) => c.modes.map((m) => label(t, m))),
        variables: paths.map((path) => {
          const mine = cols.map((x) => x.variables.find((v) => v.path === path))
          const base = mine.find((v) => v)!
          const values: Record<string, ImportedValue> = {}
          cols.forEach((x, t) => {
            const v = mine[t] ?? base // a theme without the variable uses the first one that has it
            for (const m of x.modes) {
              const cell = v.cells[m.id] ?? Object.values(v.cells)[0]
              values[label(t, m)] = { v: cell.value, ...(cell.alias && rs[t].find(cell.alias) ? { a: cell.alias } : {}) }
            }
          })
          return { name: path, type: base.type, scopes: ['ALL_SCOPES'], values }
        })
      }
    })
  return { collections }
}

/** Design tokens JSON for the Figma plugin with every chosen theme as modes. */
export function themesJson(rs: ResolvedSystem[], only?: string[]): string {
  const doc = importedDoc(themesSet(rs, only), ['ramps', 'semantic', 'type', 'grids', 'spacing', 'elevation'])
  if (rs[0].elevation && (!only || only.includes(ELEVATION))) {
    // Effect styles cannot hold modes: when the themes' shadows differ, every theme gets its own folder of styles.
    const docs = rs.map((r) => JSON.stringify(elevationDoc(r)))
    doc.Elevation = docs.every((d) => d === docs[0]) ? elevationDoc(rs[0]) : Object.fromEntries(rs.map((r) => [r.theme.name, elevationDoc(r)]))
  }
  return JSON.stringify(doc, null, 2) + '\n'
}

/** CSS with every chosen theme: the first answers to :root, each to its own [data-brand="name"]. */
export function themesCss(rs: ResolvedSystem[], only?: string[]): { css: string; count: number } {
  if (rs.length < 2) return systemCss(rs[0], only)
  const slugs = themeSlugs(rs.map((r) => ({ name: r.theme.name })))
  const parts = rs.map((r, i) => ({ ...systemCss(r, only), name: r.theme.name, slug: slugs[i], first: i === 0 }))
  return {
    css: parts.map((p) => `/* Theme: ${p.name} */\n${scopeCss(p.css, p.slug, p.first)}`).join('\n'),
    count: parts[0].count
  }
}
