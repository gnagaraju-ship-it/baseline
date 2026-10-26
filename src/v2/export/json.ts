import { importedDoc, type ImportedSet } from '../../lib/importedTokens'
import type { ResolvedSystem } from '../resolve'

/** The system as the collections the Figma plugin imports ("Imported"): own names, own modes, links kept. */
export function systemSet(r: ResolvedSystem, only?: string[]): ImportedSet {
  return {
    collections: r.collections
      .filter((c) => !only || only.includes(c.name))
      .map((c) => ({
        name: c.name,
        modes: c.modes.map((m) => m.name),
        variables: c.variables.map((v) => ({
          name: v.path,
          type: v.type,
          scopes: ['ALL_SCOPES'],
          values: Object.fromEntries(c.modes.map((m) => [m.name, { v: v.cells[m.id].value, ...(v.cells[m.id].alias && r.find(v.cells[m.id].alias!) ? { a: v.cells[m.id].alias } : {}) }]))
        }))
      }))
  }
}

/** Design tokens JSON the plugin reads. Every collection is written, whichever module the v1 export would call it. */
export function systemJson(r: ResolvedSystem, only?: string[]): string {
  const set = systemSet(r, only)
  const doc = importedDoc(set, ['ramps', 'semantic', 'type', 'grids', 'spacing', 'elevation'])
  return JSON.stringify(doc, null, 2) + '\n'
}
