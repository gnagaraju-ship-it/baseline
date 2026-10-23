/** Browser tab titles, one per route. */
export const ROUTE_TITLES: Record<string, string> = {
  '/': 'Palette',
  '/tokens': 'Tokens',
  '/contrast': 'Contrast grid',
  '/preview': 'UI preview',
  '/type': 'Type scale',
  '/grids': 'Grids',
  '/spacing': 'Spacing',
  '/elevation': 'Elevation'
}

export function titleFor(pathname: string): string {
  const t = ROUTE_TITLES[pathname]
  return t ? `${t} · Baseline` : 'Page not found · Baseline'
}
