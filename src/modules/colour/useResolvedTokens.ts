import { useMemo } from 'react'
import { resolveAll } from '../../lib/tokens'
import { useProject } from '../../store/project'
import { usePalettes } from './usePalettes'
import { useSchema } from './useSchema'

/** Semantic tokens resolved against the user's palettes and any remaps. */
export function useResolvedTokens() {
  const { palettes } = usePalettes()
  const { tokens: schema } = useSchema()
  const overrides = useProject((s) => s.tokenOverrides)
  const alphas = useProject((s) => s.tokenAlpha)
  return useMemo(() => ({ palettes, schema, ...resolveAll(palettes, overrides, alphas, schema) }), [palettes, schema, overrides, alphas])
}
