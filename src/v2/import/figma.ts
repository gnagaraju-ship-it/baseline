/**
 * Reads Figma variable collections (one JSON per collection: { id, name, modes, variables }) into a v2 design system.
 * What a collection is for (ramps, semantic colours, type, sizes) is worked out from its content, not from its name.
 */
import { emptyTheme, refOf, type Cell, type Collection, type CollectionKind, type DimensionSection, type RampRecipe, type System, type TypeSetup, type Variable } from '../model'
import { slug } from '../naming'
import { typeRows } from '../typeScale'

interface FigmaResolved { resolvedValue: unknown; alias: string | null }
export interface FigmaVariable { id: string; name: string; type: string; resolvedValuesByMode: Record<string, FigmaResolved> }
export interface FigmaCollection { id: string; name: string; modes: Record<string, string>; variables: FigmaVariable[] }

export interface ImportReport {
  collections: Array<{ name: string; kind: CollectionKind; variables: number; modes: number; note: string }>
  ramps: number
  type: { steps: number } | null
  sections: string[]
  warnings: string[]
}

export class ImportError extends Error {}

const byte = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0').toUpperCase()
const colourHex = (c: { r: number; g: number; b: number; a?: number }) => `#${byte(c.r)}${byte(c.g)}${byte(c.b)}${c.a !== undefined && c.a < 1 ? byte(c.a) : ''}`

/** Parses the text of one exported file. */
export function parseFigmaFile(text: string, fileName = 'file'): FigmaCollection {
  let json: unknown
  try { json = JSON.parse(text) } catch { throw new ImportError(`${fileName} is not valid JSON.`) }
  const c = json as Partial<FigmaCollection>
  if (!c || typeof c !== 'object' || typeof c.name !== 'string' || !c.modes || !Array.isArray(c.variables)) {
    throw new ImportError(`${fileName} is not a Figma variable collection (it needs a name, modes and variables).`)
  }
  return c as FigmaCollection
}

const isHelper = (v: FigmaVariable) => v.type === 'STRING' && / (hex|contrast)$/.test(v.name)

function convert(files: FigmaCollection[], warnings: string[]): Collection[] {
  const where = new Map<string, string>()
  for (const f of files) for (const v of f.variables) where.set(v.id, refOf(f.name, v.name))
  return files.map((f) => {
    const ids = Object.keys(f.modes)
    const used = new Set<string>()
    const modes = ids.map((id) => {
      let m = slug(f.modes[id]) || 'mode'
      while (used.has(m)) m += '-x'
      used.add(m)
      return { id: m, name: f.modes[id] }
    })
    let skipped = 0
    const variables: Variable[] = []
    for (const v of f.variables) {
      const type = v.type === 'COLOR' ? 'color' : v.type === 'FLOAT' ? 'number' : v.type === 'STRING' ? 'string' : null
      if (!type || isHelper(v)) { skipped++; continue }
      const cells: Record<string, Cell> = {}
      ids.forEach((id, i) => {
        const r = v.resolvedValuesByMode?.[id]
        if (!r) return
        const alias = r.alias && where.get(r.alias)
        if (alias) cells[modes[i].id] = { alias }
        else cells[modes[i].id] = { value: type === 'color' ? colourHex(r.resolvedValue as { r: number; g: number; b: number; a?: number }) : (r.resolvedValue as string | number) }
      })
      variables.push({ path: v.name, type, ...(type === 'number' ? { unit: 'px' as const } : {}), cells })
    }
    if (skipped) warnings.push(`${f.name}: ${skipped} helper or unsupported variables were left out.`)
    return { name: f.name, kind: 'other' as CollectionKind, modes, variables }
  })
}

const prefixOf = (path: string) => path.split('/').slice(0, -1).join('/')
const lastOf = (path: string) => path.split('/').pop()!

/** The colour of a variable's first mode, following links. */
function hexOf(all: Collection[], c: Collection, v: Variable, depth = 0): string {
  const cell = v.cells[c.modes[0].id]
  if (!cell) return ''
  if (cell.alias === undefined) return String(cell.value ?? '')
  const [cn, vn] = cell.alias.split('::')
  const tc = all.find((x) => x.name === cn)
  const tv = tc?.variables.find((x) => x.path === vn)
  return tc && tv && depth < 8 ? hexOf(all, tc, tv, depth + 1) : ''
}

/** Ramp families of a collection: a path prefix with six or more plain colours (their own, or followed from another ramp). */
function families(all: Collection[], c: Collection): Map<string, Variable[]> {
  const map = new Map<string, Variable[]>()
  // A ramp has one value per step; a collection with several modes holds tokens, not ramps.
  if (c.modes.length !== 1) return map
  for (const v of c.variables) {
    if (v.type !== 'color' || !prefixOf(v.path)) continue
    if (!/^#[0-9A-F]{6}$/i.test(hexOf(all, c, v))) continue
    const list = map.get(prefixOf(v.path)) ?? []
    list.push(v)
    map.set(prefixOf(v.path), list)
  }
  // steps are numbers (50, 100 ... or 1, 2 ...)
  for (const [k, list] of map) if (list.length < 6 || list.filter((v) => /^\d+$/.test(lastOf(v.path))).length < list.length * 0.8) map.delete(k)
  return map
}

function groupOf(name: string): RampRecipe['group'] {
  const n = name.toLowerCase()
  if (/brand|primary|accent/.test(n)) return 'brand'
  if (/neutral|gr[ae]y|slate|zinc|stone|taupe|mauve|mist|olive/.test(n)) return 'neutral'
  if (/red|green|yellow|orange|amber|error|success|warning|danger/.test(n)) return 'status'
  return 'other'
}

const kindOf = (group: string, name: string): Variable['kind'] =>
  /^(text|foreground)$/i.test(group) ? 't' : /^border$/i.test(group) ? 'b' : /^(effects|alpha)$/i.test(group) ? 'a' : /text|fg/.test(name) ? 't' : 's'

const titleOf = (name: string) => {
  const t = name.replace(/^[\d.\s_]+/, '').replace(/[_-]+/g, ' ').trim() || name
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** Works out ramps, semantic colours, type and sizes, and builds the system. */
export function inferSystem(files: FigmaCollection[], name: string): { system: System; report: ImportReport } {
  if (!files.length) throw new ImportError('Choose at least one file.')
  const names = files.map((f) => f.name)
  if (new Set(names).size !== names.length) throw new ImportError('Two of the files are the same collection.')
  const warnings: string[] = []
  const collections = convert(files, warnings)
  const recipes: RampRecipe[] = []
  const dimensions: DimensionSection[] = []
  const notes: Record<string, string> = {}
  let type: TypeSetup | undefined

  // 1. ramps
  for (const c of collections) {
    const fam = families(collections, c)
    const inRamps = [...fam.values()].reduce((n, l) => n + l.length, 0)
    if (!fam.size || inRamps < c.variables.length / 3) continue
    c.kind = 'ramp'
    for (const [prefix, list] of fam) {
      const steps = list.map((v) => lastOf(v.path))
      const base = Math.max(1, steps.indexOf('600') + 1 || steps.indexOf('500') + 1 || Math.ceil(steps.length / 2))
      recipes.push({
        id: slug(`${c.name} ${prefix}`), name: lastOf(prefix), collection: c.name, family: prefix, steps, base, group: groupOf(prefix),
        start: list.map((v) => hexOf(collections, c, v).slice(1, 7).toUpperCase())
      })
    }
    notes[c.name] = `${fam.size} colour ramps`
  }

  // 2. semantic colours
  for (const c of collections) {
    if (c.kind !== 'other') continue
    const colours = c.variables.filter((v) => v.type === 'color')
    if (colours.length < c.variables.length / 2 || !colours.length) continue
    const linked = colours.some((v) => Object.values(v.cells).some((x) => x.alias !== undefined))
    if (!linked) continue
    c.kind = 'semantic'
    for (const v of c.variables) {
      const parts = v.path.split('/')
      if (parts.length >= 3) { v.group = parts[1]; v.kind = kindOf(parts[1], lastOf(v.path)) }
    }
    notes[c.name] = `${colours.length} colour tokens, ${c.modes.length} modes`
  }

  // 3. type: font sizes with matching line heights
  for (const c of collections) {
    if (c.kind !== 'other') continue
    const sizes = c.variables.filter((v) => v.type === 'number' && /font[ _-]?size/i.test(prefixOf(v.path)))
    if (!sizes.length) continue
    const lines = c.variables.filter((v) => v.type === 'number' && /line[ _-]?height/i.test(prefixOf(v.path)))
    const fonts = c.variables.filter((v) => v.type === 'string' && /famil/i.test(v.path))
    if (fonts.length < 1) { warnings.push(`${c.name}: font sizes found, but no font family variables, so no type was set up.`); continue }
    const value = (v: Variable) => Number(v.cells[c.modes[0].id]?.value ?? 0)
    const sizePrefix = prefixOf(sizes[0].path)
    const linePrefix = lines.length ? prefixOf(lines[0].path) : undefined
    const heading = fonts.find((f) => /display|head|title/i.test(f.path)) ?? fonts[0]
    const body = fonts.find((f) => f !== heading && /body|text|base/i.test(f.path)) ?? fonts.find((f) => f !== heading) ?? heading
    const familyOf = (v: Variable) => String(v.cells[c.modes[0].id]?.value ?? '')
    type = {
      collection: c.name,
      kind: 'fixed',
      base: 16, ratio: 1, grid: 4,
      headingFont: familyOf(heading),
      bodyFont: familyOf(body),
      steps: sizes.map((v) => {
        const step = lastOf(v.path)
        const lh = lines.find((l) => lastOf(l.path) === step)
        const prefix = step.split('-')[0]
        return { name: step, group: prefix.toUpperCase(), font: /display|head|title/i.test(prefix) ? 'heading' as const : 'body' as const, size: value(v), lh: lh ? value(lh) : Math.round(value(v) * 1.4), tr: 0, weight: /display|head|title/i.test(prefix) ? 600 : 400 }
      }),
      paths: { size: `${sizePrefix}/{step}`, line: `${linePrefix ?? sizePrefix}/{step}`, headingFont: heading.path, bodyFont: body.path }
    }
    c.kind = 'type'
    notes[c.name] = `${sizes.length} type steps`
    break
  }

  // 4. sizes: collections of numbers, and numbers that sit with the colour ramps
  const sections: Array<DimensionSection & { first: Variable[] }> = []
  const addSection = (c: Collection, prefix: string | undefined, vars: Variable[]) => {
    const title = prefix ? `${titleOf(prefix.replace(/\/$/, ''))} scale` : titleOf(c.name)
    const radius = /radius|corner/i.test(title)
    sections.push({
      id: slug(`${c.name} ${prefix ?? ''}`), title, collection: c.name, ...(prefix ? { prefix } : {}),
      shape: radius ? 'radius' : c.modes.length > 1 || /container/i.test(title) ? 'plain' : 'bar', first: vars
    })
  }
  for (const c of collections) {
    if (c.kind === 'other') {
      const nums = c.variables.filter((v) => v.type === 'number')
      if (nums.length && nums.length >= c.variables.length / 2) { c.kind = 'dimension'; addSection(c, undefined, nums); notes[c.name] = `${nums.length} sizes` }
    } else if (c.kind === 'ramp') {
      const byPrefix = new Map<string, Variable[]>()
      for (const v of c.variables.filter((x) => x.type === 'number' && x.path.includes('/'))) {
        const p = `${v.path.split('/')[0]}/`
        byPrefix.set(p, [...(byPrefix.get(p) ?? []), v])
      }
      for (const [p, list] of byPrefix) if (list.length >= 3) addSection(c, p, list)
    }
  }
  // links: a section whose values mostly point into another section follows it
  for (const sec of sections) {
    const targets = new Map<string, number>()
    for (const v of sec.first) {
      const a = Object.values(v.cells)[0]?.alias
      if (!a) continue
      const other = sections.find((o) => o !== sec && a.startsWith(`${o.collection}::`) && (!o.prefix || a.slice(o.collection.length + 2).startsWith(o.prefix)))
      if (other) targets.set(other.id, (targets.get(other.id) ?? 0) + 1)
    }
    const best = [...targets.entries()].sort((a, b) => b[1] - a[1])[0]
    if (best && best[1] >= sec.first.length / 2) sec.follows = best[0]
  }
  for (const sec of sections) {
    if (sections.some((o) => o.follows === sec.id)) sec.addPath = `${sec.prefix ?? ''}custom ({n}px)`
    const { first, ...section } = sec
    void first
    dimensions.push(section)
  }

  for (const c of collections) if (c.kind === 'other' && !notes[c.name]) notes[c.name] = 'kept as it is'

  const system: System = {
    id: `imported-${slug(name) || 'system'}`,
    name: name.trim() || 'Imported system',
    collections,
    recipes,
    ...(type ? { type } : {}),
    ...(dimensions.length ? { dimensions } : {}),
    naming: { prefix: '--', separator: '-' },
    themes: [emptyTheme('base', 'Base')]
  }
  if (type) typeRows(type, undefined) // fail early if the setup cannot be read
  return {
    system,
    report: {
      collections: collections.map((c) => ({ name: c.name, kind: c.kind, variables: c.variables.length, modes: c.modes.length, note: notes[c.name] ?? '' })),
      ramps: recipes.length,
      type: type ? { steps: type.steps.length } : null,
      sections: dimensions.map((d) => d.title),
      warnings
    }
  }
}
