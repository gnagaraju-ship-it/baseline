import { norm } from '../../lib/colour'
import { importedDoc, type ImportedSet } from '../../lib/importedTokens'
import type { ResolvedSystem } from '../resolve'
import { ELEVATION } from './css'

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

const px = (n: number) => `${+n.toFixed(2)}px`

/** The shadows as W3C shadow tokens, which the plugin makes into effect styles. */
export function elevationDoc(r: ResolvedSystem): Record<string, unknown> {
  const e = r.elevation!
  const base = norm(e.shadow) ?? '000000'
  const hex = (op: number) => `#${base}${Math.round((op / 100) * 255).toString(16).padStart(2, '0').toUpperCase()}`
  return Object.fromEntries(e.tokens.map((t) => [t.name, { $type: 'shadow', $value: t.layers.map((l) => ({ color: hex(l.op), offsetX: px(l.x), offsetY: px(l.y), blur: px(l.blur), spread: px(l.spread) })) }]))
}

/** Design tokens JSON the plugin reads. Every collection is written, whichever module the v1 export would call it. */
export function systemJson(r: ResolvedSystem, only?: string[]): string {
  const set = systemSet(r, only)
  const doc = importedDoc(set, ['ramps', 'semantic', 'type', 'grids', 'spacing', 'elevation'])
  if (r.elevation && (!only || only.includes(ELEVATION))) doc.Elevation = elevationDoc(r)
  return JSON.stringify(doc, null, 2) + '\n'
}
