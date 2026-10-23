import { useMemo } from 'react'
import { buildPalettes, tokenRows } from '../../lib/colour'
import { useProject } from '../../store/project'

/** Palettes and CSS token rows derived from the shared project settings. */
export function usePalettes() {
  const settings = useProject((s) => s.settings)
  return useMemo(() => {
    const palettes = buildPalettes(settings)
    return { palettes, rows: tokenRows(palettes) }
  }, [settings])
}
