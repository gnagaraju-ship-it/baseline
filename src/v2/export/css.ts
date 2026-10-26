import { shadowCss } from '../../lib/elevation'
import { splitRef } from '../model'
import { cssName, slug } from '../naming'
import type { ResolvedCell, ResolvedCollection, ResolvedSystem, ResolvedVariable } from '../resolve'

/** The first mode answers to :root, a dark mode to [data-theme="dark"], any other mode to a data attribute. */
function selectorFor(collection: ResolvedCollection, modeName: string, index: number): string {
  if (index === 0) return ':root'
  if (/dark/i.test(modeName)) return '[data-theme="dark"]'
  return `[data-${slug(collection.name.replace(/^[\d.\s_]+/, ''))}="${slug(modeName)}"]`
}

function valueOf(r: ResolvedSystem, v: ResolvedVariable, cell: ResolvedCell): string {
  const policy = r.system.naming
  if (cell.alias !== undefined && r.find(cell.alias)) return `var(${cssName(policy, splitRef(cell.alias)[1])})`
  if (typeof cell.value === 'number') return `${cell.value}${v.unit ?? 'px'}`
  return v.type === 'string' && !/^#[0-9A-F]{6,8}$/i.test(cell.value) ? JSON.stringify(cell.value) : cell.value
}

/** The name the export dialog gives the shadows, next to the names of the collections. */
export const ELEVATION = 'Elevation'

export interface CssResult { css: string; count: number }

/** CSS custom properties for the chosen collections (all when none are named), with names from the naming policy. */
export function systemCss(r: ResolvedSystem, only?: string[]): CssResult {
  const blocks: string[] = []
  let count = 0
  for (const c of r.collections) {
    if (only && !only.includes(c.name)) continue
    count += c.variables.length
    c.modes.forEach((m, i) => {
      const lines = c.variables.map((v) => `  ${cssName(r.system.naming, v.path)}: ${valueOf(r, v, v.cells[m.id])};`)
      if (lines.length) blocks.push(`/* ${c.name}${c.modes.length > 1 ? `: ${m.name}` : ''} */\n${selectorFor(c, m.name, i)} {\n${lines.join('\n')}\n}`)
    })
  }
  // shadows are not variables: each level is one custom property holding the whole multi-layer shadow
  if (r.elevation && (!only || only.includes(ELEVATION))) {
    const lines = r.elevation.tokens.map((t) => `  ${cssName(r.system.naming, `elevation/${t.name}`)}: ${shadowCss(t.layers, r.elevation!.shadow)};`)
    if (lines.length) blocks.push(`/* Elevation */\n:root {\n${lines.join('\n')}\n}`)
    count += r.elevation.tokens.length
  }
  return { css: blocks.join('\n\n') + (blocks.length ? '\n' : ''), count }
}
