import { UNTITLED_ID, colourSchema } from '../../lib/schemas'
import { emptyTheme, refOf, type Cell, type Collection, type RampRecipe, type System, type Variable } from '../model'

const PRIMITIVES = '_Primitives'
const MODES = '1. Color modes'

/** Untitled UI as it is in its Figma files: 27 ramps of 11 steps plus white and black, and 273 semantic colour tokens. */
export function untitledSystem(): System {
  const schema = colourSchema(UNTITLED_ID)!
  const byKey = new Map(schema.palettes.map((p) => [p.key, p]))
  const stepsOf = (key: string) => byKey.get(key)?.labels ?? schema.steps

  const ramps: Variable[] = schema.palettes.flatMap((p) =>
    p.steps.map((h, i) => ({ path: `Colors/${p.name}/${stepsOf(p.key)[i]}`, type: 'color' as const, cells: { style: { value: `#${h}` } } }))
  )
  const primitives: Collection = { name: PRIMITIVES, kind: 'ramp', modes: [{ id: 'style', name: 'Style' }], variables: ramps }

  const cell = (ref: string): Cell => {
    if (ref.startsWith('raw:')) return { value: ref.slice(4) }
    const i = ref.lastIndexOf('-')
    const p = byKey.get(ref.slice(0, i))
    return p ? { alias: refOf(PRIMITIVES, `Colors/${p.name}/${ref.slice(i + 1)}`) } : { value: '' }
  }
  const semantic: Collection = {
    name: MODES,
    kind: 'semantic',
    modes: [{ id: 'light', name: 'Light mode' }, { id: 'dark', name: 'Dark mode' }],
    variables: schema.tokens.map((t) => ({ path: t.path ?? t.name, type: 'color' as const, group: t.group, kind: t.kind, cells: { light: cell(t.light), dark: cell(t.dark) } }))
  }

  const recipes: RampRecipe[] = schema.palettes
    .filter((p) => !p.labels)
    .map((p) => ({
      id: p.key,
      name: p.name,
      collection: PRIMITIVES,
      family: `Colors/${p.name}`,
      steps: schema.steps,
      base: p.base,
      start: p.steps,
      group: p.group === 'brand' ? 'brand' : p.group === 'neutral' ? 'neutral' : p.group === 'semantic' ? 'status' : 'other'
    }))

  return {
    id: 'untitled',
    name: 'Untitled',
    collections: [primitives, semantic],
    recipes,
    naming: { prefix: '--', separator: '-' },
    themes: [emptyTheme('base', 'Base')]
  }
}
