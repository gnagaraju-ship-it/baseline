/**
 * Baseline v2 token model. A design system is data: collections of variables with modes, links between variables,
 * recipes that generate ramps, a naming policy and themes. Nothing in here knows about a particular system.
 */

import type { ElevationPresetKey, Level } from '../lib/elevation'

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
  /** Written after a number in CSS (px by default; em for tracking, empty for weights). */
  unit?: 'px' | 'em' | ''
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

/** A named type step. In a fixed system its size and line height are its own; in a scale they come from the base and ratio. */
export interface TypeStepDef {
  name: string
  group: string
  font: 'heading' | 'body'
  size?: number
  lh?: number
  /** Letter spacing in em. */
  tr?: number
  weight?: number
}

/** A list of sizes shown together on the sizes screen (a spacing scale, radius, widths, a grid ...). */
export interface DimensionSection {
  id: string
  title: string
  collection: string
  /** Only the variables whose path starts with this. */
  prefix?: string
  /** How a value is drawn. */
  shape: 'bar' | 'radius' | 'plain'
  /** The section whose variables a value here may follow. */
  follows?: string
  /** A path for a variable the user adds, with {n} for its value; none means the section cannot grow. */
  addPath?: string
}

/** Shadows by level: the multi-layer shadows of elevation, with one base colour. */
export interface ElevationSetup {
  preset: ElevationPresetKey
  tokens: Level[]
  /** The shadow colour as typed. */
  shadow: string
}

/** How a system's type is made: from a base size and ratio ("scale"), or from sizes written down ("fixed"). */
export interface TypeSetup {
  collection: string
  kind: 'scale' | 'fixed'
  base: number
  ratio: number
  /** Line heights snap to this grid (scale only). */
  grid: number
  headingFont: string
  bodyFont: string
  steps: TypeStepDef[]
  /** Variable paths, with {step} for the step's name. A property without a path is not exported. */
  paths: { size: string; line: string; track?: string; weight?: string; headingFont: string; bodyFont: string }
}

/** What a theme changes in the type. */
export interface ThemeType {
  base?: number
  ratio?: number
  grid?: number
  headingFont?: string
  bodyFont?: string
  /** A size, line height or tracking of its own for one step. */
  steps?: Record<string, { size?: number; lh?: number; tr?: number }>
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
  type?: ThemeType
  /** Shadows the theme changed: a preset, its own levels, or another colour. */
  elevation?: Partial<ElevationSetup>
  /** Variables the theme adds, by collection name. */
  added?: Record<string, Variable[]>
}

export interface System {
  id: string
  name: string
  collections: Collection[]
  recipes: RampRecipe[]
  type?: TypeSetup
  dimensions?: DimensionSection[]
  elevation?: ElevationSetup
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
