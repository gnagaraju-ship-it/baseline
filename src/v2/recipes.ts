import { gen, norm } from '../lib/colour'
import type { RampRecipe } from './model'

/** The steps of a ramp for a typed colour: the starting ramp while the colour is unchanged, else generated around it. */
export function rampSteps(recipe: RampRecipe, typed: string | undefined): string[] {
  const hex = norm(typed)
  const start = recipe.start[recipe.base - 1]
  if (!hex || hex === start) return [...recipe.start]
  return gen(hex, recipe.base, recipe.steps.length)
}

/** The colour a recipe starts at (its base step). */
export const startHex = (recipe: RampRecipe) => recipe.start[recipe.base - 1]
