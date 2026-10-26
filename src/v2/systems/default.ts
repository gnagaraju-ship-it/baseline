import { buildPalettes, defaultSettings } from '../../lib/colour'
import { computeGroups, defaultTypeSettings } from '../../lib/typeScale'
import { defaultElevationSettings } from '../../lib/elevation'
import { BREAKPOINTS, computeGrid, defaultGridSettings } from '../../lib/grid'
import { defaultSpacingSettings, onValues, scaleSteps } from '../../lib/spacing'
import { ALPHA, DEFAULT_SCHEMA } from '../../lib/tokens'
import { emptyTheme, refOf, type Cell, type Collection, type DimensionSection, type RampRecipe, type System, type TypeSetup, type Variable } from '../model'
import { typeRows, typeVariables } from '../typeScale'

const PRIMITIVES = 'Primitives'
const SEMANTIC = 'Semantic'
const hex = (h: string) => `#${h}`
const alphaHex = (base: string, a: number) => `#${base}${Math.round(a * 255).toString(16).padStart(2, '0').toUpperCase()}`

/** "neutral-3" or "blackA-5" as a link to the variable of that step. */
function link(ref: string): string {
  const i = ref.lastIndexOf('-')
  const key = ref.slice(0, i)
  const step = ref.slice(i + 1)
  return refOf(PRIMITIVES, `${key === 'blackA' ? 'black-alpha' : key === 'whiteA' ? 'white-alpha' : key}/${step}`)
}

/** Baseline's own system: 16-step ramps from the Primary, Neutral, Info and status colours, and 58 semantic tokens. */
export function defaultSystem(): System {
  const palettes = buildPalettes(defaultSettings())
  const labels = DEFAULT_SCHEMA.steps as string[]

  const recipes: RampRecipe[] = palettes.map((p) => ({
    id: p.key,
    name: p.name,
    collection: PRIMITIVES,
    family: p.key,
    steps: labels,
    base: p.base,
    start: p.steps,
    group: p.key === 'primary' ? 'brand' : p.key === 'neutral' ? 'neutral' : 'status'
  }))

  const ramps: Variable[] = [
    ...palettes.flatMap((p) => p.steps.map((h, i) => ({ path: `${p.key}/${labels[i]}`, type: 'color' as const, cells: { value: { value: hex(h) } } }))),
    ...(['black-alpha', 'white-alpha'] as const).flatMap((key) =>
      ALPHA.map((a, i) => ({ path: `${key}/${i + 1}`, type: 'color' as const, cells: { value: { value: alphaHex(key === 'black-alpha' ? '000000' : 'FFFFFF', a) } } }))
    )
  ]
  const primitives: Collection = { name: PRIMITIVES, kind: 'ramp', modes: [{ id: 'value', name: 'Value' }], variables: ramps }

  const semantic: Collection = {
    name: SEMANTIC,
    kind: 'semantic',
    modes: [{ id: 'light', name: 'Light' }, { id: 'dark', name: 'Dark' }],
    variables: DEFAULT_SCHEMA.defs.map((d) => ({
      path: d.name,
      type: 'color' as const,
      group: d.group,
      kind: d.kind,
      cells: { light: { alias: link(d.light) } as Cell, dark: { alias: link(d.dark) } as Cell }
    }))
  }

  const v1 = defaultTypeSettings()
  const type: TypeSetup = {
    collection: 'Type',
    kind: 'scale',
    base: v1.base,
    ratio: v1.ratio,
    grid: v1.grid,
    headingFont: v1.headingFont,
    bodyFont: v1.bodyFont,
    steps: computeGroups({ ...v1, tablet: { on: false, pct: 0 }, mobile: { on: false, pct: 0 } }).flatMap((g) => g.rows.map((r) => ({ name: r.name, group: g.title, font: r.font, weight: r.weight, tr: r.tr }))),
    paths: { size: 'type/{step}/size', line: 'type/{step}/line', track: 'type/{step}/track', weight: 'type/{step}/weight', headingFont: 'type/font/heading', bodyFont: 'type/font/body' }
  }
  const typeCollection: Collection = { name: 'Type', kind: 'type', modes: [{ id: 'value', name: 'Value' }], variables: typeVariables(type, typeRows(type, undefined)) }

  const sp = defaultSpacingSettings()
  const steps = onValues(scaleSteps(sp.base, sp.extra), sp.on)
  const spacing: Collection = {
    name: 'Spacing',
    kind: 'dimension',
    modes: [{ id: 'value', name: 'Value' }],
    variables: steps.map((n) => ({ path: `space/${n}`, type: 'number' as const, unit: 'px' as const, cells: { value: { value: n } } }))
  }
  const grid = defaultGridSettings()
  const layouts = Object.fromEntries(BREAKPOINTS.map((b) => [b.key, computeGrid(grid, b.key)]))
  const gridCollection: Collection = {
    name: 'Grid',
    kind: 'dimension',
    modes: BREAKPOINTS.map((b) => ({ id: b.key, name: b.label })),
    variables: ([
      ['grid/width', (k: string) => BREAKPOINTS.find((b) => b.key === k)!.width, 'px'],
      ['grid/columns', (k: string) => layouts[k].columns, ''],
      ['grid/gutter', (k: string) => layouts[k].gutter, 'px'],
      ['grid/margin', (k: string) => layouts[k].margin, 'px'],
      ['grid/sidebar', (k: string) => layouts[k].sidebarWidth, 'px']
    ] as const).map(([path, pick, unit]) => ({ path, type: 'number' as const, unit, cells: Object.fromEntries(BREAKPOINTS.map((b) => [b.key, { value: pick(b.key) }])) }))
  }
  const dimensions: DimensionSection[] = [
    { id: 'space', title: 'Spacing scale', collection: 'Spacing', shape: 'bar', addPath: 'space/{n}' },
    { id: 'grid', title: 'Grid by breakpoint', collection: 'Grid', shape: 'plain' }
  ]

  return {
    id: 'default',
    name: 'Default',
    collections: [primitives, semantic, typeCollection, spacing, gridCollection],
    recipes,
    type,
    dimensions,
    elevation: defaultElevationSettings(),
    naming: { prefix: '--', separator: '-' },
    themes: [emptyTheme('base', 'Base')]
  }
}

/** Titles for the groups of Default's semantic tokens. */
export const DEFAULT_GROUP_TITLES: Record<string, string> = { bg: 'Backgrounds', text: 'Text', border: 'Borders' }
