import { useMemo } from 'react'
import { resolveAll } from '../../lib/tokens'
import { useProject } from '../../store/project'
import { usePalettes } from './usePalettes'

/** Semantic tokens resolved against the user's palettes and any remaps. */
export function useResolvedTokens() {
  const { palettes } = usePalettes()
  const overrides = useProject((s) => s.tokenOverrides)
  return useMemo(() => ({ palettes, ...resolveAll(palettes, overrides) }), [palettes, overrides])
}
