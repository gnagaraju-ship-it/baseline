import { useMemo } from 'react'
import { buildPalettes, tokenRows } from '../../lib/colour'
import { useProject } from '../../store/project'
import { useSchema } from './useSchema'

/** Palettes and CSS token rows derived from the shared project settings. */
export function usePalettes() {
  const settings = useProject((s) => s.settings)
  const { colour } = useSchema()
  return useMemo(() => {
    const palettes = buildPalettes(settings, colour)
    return { palettes, rows: tokenRows(palettes, colour?.steps) }
  }, [settings, colour])
}
