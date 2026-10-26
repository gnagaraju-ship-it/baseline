/**
 * Baseline v2 token model. A design system is data: collections of variables with modes, links between variables,
 * recipes that generate ramps, a naming policy and themes. Nothing in here knows about a particular system.
 */

export type VarType = 'color' | 'number' | 'string'

export interface Mode { id: string; name: string }

/** A value, or a link to another variable ("Collection::path"). */
export interface Cell { value?: string | number; alias?: string }

export interface Variable {
  /** Path inside its collection, for example "Colors/Brand/600" or "bg-fill". */
  path: string
  type: VarType
  /** Value per mode id. A mode a variable has no cell for falls back to its first mode. */
  cells: Record<string, Cell>
  /** A heading to group variables under on screens (Text, Border ...). */
  group?: string
  /** The token kind the colour contrast is judged for (surface, fill, text, border, alpha). */
  kind?: 's' | 'f' | 't' | 'o' | 'b' | 'a'
}

export type CollectionKind = 'ramp' | 'semantic' | 'dimension' | 'type' | 'other'

export interface Collection {
  /** The name is the identity: links use it. */
  name: string
  kind: CollectionKind
  modes: Mode[]
  variables: Variable[]
}

/** A ramp made from one colour: the variables `<family>/<step>` of a collection. */
export interface RampRecipe {
  id: string
  /** Shown name. */
  name: string
  collection: string
  /** Path prefix of the ramp's variables, for example "Colors/Brand". */
  family: string
  steps: string[]
  /** 1-based step that equals the colour typed in. */
  base: number
  /** The ramp the system starts with, hand-picked or generated. */
  start: string[]
  group: 'brand' | 'neutral' | 'status' | 'other'
}

export interface NamingPolicy {
  /** Put before every CSS custom property, for example "--". */
  prefix: string
  separator: string
}

export interface Theme {
  id: string
  name: string
  /** A different colour for a ramp, by recipe id. */
  ramps: Record<string, string>
  /** A different cell for a variable in a mode, by `<collection>::<path>|<mode id>`. */
  overrides: Record<string, Cell>
}

export interface System {
  id: string
  name: string
  collections: Collection[]
  recipes: RampRecipe[]
  naming: NamingPolicy
  themes: Theme[]
}

export const refOf = (collection: string, path: string) => `${collection}::${path}`
export const splitRef = (ref: string): [string, string] => {
  const i = ref.indexOf('::')
  return [ref.slice(0, i), ref.slice(i + 2)]
}
export const overrideKey = (collection: string, path: string, modeId: string) => `${collection}::${path}|${modeId}`

export function emptyTheme(id: string, name: string): Theme {
  return { id, name, ramps: {}, overrides: {} }
}
