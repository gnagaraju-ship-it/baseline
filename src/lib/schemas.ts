/**
 * Colour schemas: the shape a theme's colours take (ramp steps, palettes, semantic tokens). Themes without a schema use
 * Baseline's own. Untitled's comes from the Untitled UI files (scripts/build-untitled-colour.mjs).
 */
import untitledColour from '../data/untitled-colour.json'
import type { Palette } from './colour'
import { DEFAULT_SCHEMA, type TokenDef, type TokenSchema } from './tokens'

export interface SchemaPalette {
  key: string
  name: string
  group: Palette['group']
  /** 1-based step that equals the colour typed in. */
  base: number
  labels?: string[]
  /** The starting ramp, as in the source files. */
  steps: string[]
}

export interface ColourSchema {
  id: string
  steps: string[]
  palettes: SchemaPalette[]
  groups: Array<{ key: string; title: string }>
  tokens: TokenDef[]
  /** Which palette plays which role for the contrast grid and charts. */
  roles: Record<'primary' | 'neutral' | 'info' | 'success' | 'caution' | 'warning' | 'critical', string>
  anchors: Omit<TokenSchema['anchors'], never>
}

export const UNTITLED_ID = 'untitled-ui'

const SCHEMAS: Record<string, ColourSchema> = {
  [UNTITLED_ID]: { id: UNTITLED_ID, ...(untitledColour as unknown as Omit<ColourSchema, 'id'>) }
}

/** The colour schema with this id; null means Baseline's own. */
export const colourSchema = (id: string | undefined): ColourSchema | null => (id ? SCHEMAS[id] ?? null : null)

const cache = new Map<string, TokenSchema>()

/** The token schema of a colour schema (or Baseline's own for null). */
export function tokenSchemaOf(schema: ColourSchema | null): TokenSchema {
  if (!schema) return DEFAULT_SCHEMA
  let t = cache.get(schema.id)
  if (!t) {
    t = { steps: schema.steps, alpha: [], defs: schema.tokens, groups: schema.groups, anchors: schema.anchors }
    cache.set(schema.id, t)
  }
  return t
}
