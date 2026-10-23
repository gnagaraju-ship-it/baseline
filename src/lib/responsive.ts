/**
 * Responsive values by breakpoint. The Figma file gets one variable collection with the modes XXL, MD and XS
 * (the way Light and Dark are modes of the Semantic collection), and the CSS gets mobile-first media queries.
 */
import { computeGrid, type BreakpointKey, type GridSettings } from './grid'
import { computeGroups, withGridBreakpoints, type TypeGroup, type TypeSettings } from './typeScale'

export type ByBreakpoint<T> = Record<BreakpointKey, T>

/** Figma mode names, in the order Figma lists them. */
export const MODE_NAMES: Record<BreakpointKey, string> = { xxl: 'XXL', md: 'MD', xs: 'XS' }
export const MODE_ORDER: BreakpointKey[] = ['xxl', 'md', 'xs']

/** The type scale at each breakpoint. Headings shrink on MD and XS by the Tablet and Mobile percentages. */
export function typeByBreakpoint(type: TypeSettings, grid: GridSettings): ByBreakpoint<TypeGroup[]> {
  const base = withGridBreakpoints(type, grid.on.md, grid.on.xs)
  return {
    xxl: computeGroups({ ...base, view: 'desktop' }),
    md: computeGroups({ ...base, view: 'tablet' }),
    xs: computeGroups({ ...base, view: 'mobile' })
  }
}

/** Grid layout at each breakpoint, whether or not the breakpoint is switched on in Grids. */
export function gridByBreakpoint(grid: GridSettings) {
  return Object.fromEntries(MODE_ORDER.map((k) => [k, computeGrid(grid, k)])) as ByBreakpoint<ReturnType<typeof computeGrid>>
}

export { responsiveBlocks } from './breakpointCss'
