import { computeGroups, defaultTypeSettings } from '../lib/typeScale'
import type { ThemeType, TypeSetup, TypeStepDef, Variable } from './model'

export interface TypeRow {
  name: string
  group: string
  font: 'heading' | 'body'
  size: number
  lh: number
  tr: number
  weight: number
}

const fill = (template: string, step: string) => template.replace('{step}', step)

/** The type of a system for a theme: every step with its size, line height, tracking and weight. */
export function typeRows(setup: TypeSetup, theme: ThemeType | undefined): TypeRow[] {
  const t = theme ?? {}
  const own = t.steps ?? {}
  if (setup.kind === 'scale') {
    const settings = {
      ...defaultTypeSettings(),
      base: t.base ?? setup.base,
      ratio: t.ratio ?? setup.ratio,
      grid: t.grid ?? setup.grid,
      headingFont: t.headingFont ?? setup.headingFont,
      bodyFont: t.bodyFont ?? setup.bodyFont,
      tablet: { on: false, pct: 0 },
      mobile: { on: false, pct: 0 },
      overrides: Object.fromEntries(Object.entries(own).map(([k, v]) => [k, { lh: v.lh, tr: v.tr }]))
    }
    return computeGroups(settings).flatMap((g) =>
      g.rows.map((r) => ({ name: r.name, group: g.title, font: r.font, size: own[r.name]?.size ?? r.size, lh: r.lh, tr: r.tr, weight: r.weight }))
    )
  }
  return setup.steps.map((d: TypeStepDef) => {
    const o = own[d.name] ?? {}
    const size = o.size ?? d.size ?? 16
    // A size changed by hand takes the line height with it, in proportion, unless the line height is set too.
    const lh = o.lh ?? Math.round((d.lh ?? size) * (size / (d.size ?? size)))
    return { name: d.name, group: d.group, font: d.font, size, lh, tr: o.tr ?? d.tr ?? 0, weight: d.weight ?? 400 }
  })
}

export const stepPath = (setup: TypeSetup, prop: 'size' | 'line' | 'track' | 'weight', step: string): string | undefined => {
  const t = setup.paths[prop]
  return t ? fill(t, step) : undefined
}

/** The variables that hold a system's type, with the values it starts with. */
export function typeVariables(setup: TypeSetup, rows: TypeRow[], extra: Variable[] = []): Variable[] {
  const mode = 'value'
  const num = (path: string | undefined, value: number, unit: Variable['unit'], group: string): Variable[] =>
    path ? [{ path, type: 'number', unit, group, cells: { [mode]: { value } } }] : []
  const str = (path: string, value: string): Variable => ({ path, type: 'string', group: 'Fonts', cells: { [mode]: { value } } })
  return [
    str(setup.paths.headingFont, setup.headingFont),
    str(setup.paths.bodyFont, setup.bodyFont),
    ...extra,
    ...rows.flatMap((r) => [
      ...num(stepPath(setup, 'size', r.name), r.size, 'px', r.group),
      ...num(stepPath(setup, 'line', r.name), r.lh, 'px', r.group),
      ...num(stepPath(setup, 'track', r.name), r.tr, 'em', r.group),
      ...num(stepPath(setup, 'weight', r.name), r.weight, '', r.group)
    ])
  ]
}
