/** Mobile-first CSS for values that change by breakpoint. */
import { BREAKPOINTS, type BreakpointKey } from './grid'

const widthOf = (k: BreakpointKey) => BREAKPOINTS.find((b) => b.key === k)!.width

/**
 * Mobile-first CSS for values that change by breakpoint. `lines` holds the same declarations, in the same order, for
 * each breakpoint. The base block carries the XS values, the MD and XXL media blocks only what changes. When nothing
 * changes, a single block is written.
 */
export function responsiveBlocks(fixed: string[], lines: Record<BreakpointKey, string[]>): string {
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((l, i) => l === b[i])
  if (same(lines.xs, lines.md) && same(lines.md, lines.xxl)) return `:root {\n${[...fixed, ...lines.xxl].join('\n')}\n}`
  const blocks = [`:root {\n${[...fixed, ...lines.xs].join('\n')}\n}`]
  const changed = (from: string[], to: string[]) => to.filter((l, i) => l !== from[i])
  const md = changed(lines.xs, lines.md)
  if (md.length) blocks.push(`@media (min-width: ${widthOf('md')}px) {\n  :root {\n${md.map((l) => '  ' + l).join('\n')}\n  }\n}`)
  const xxl = changed(lines.md, lines.xxl)
  if (xxl.length) blocks.push(`@media (min-width: ${widthOf('xxl')}px) {\n  :root {\n${xxl.map((l) => '  ' + l).join('\n')}\n  }\n}`)
  return blocks.join('\n\n')
}
