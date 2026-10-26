import { useMemo } from 'react'
import { exportSections, type ExportModule } from '../../lib/exportAll'
import { pickData, useProject } from '../../store/project'

/** The CSS the export writes for one module of the active theme, for the screens' Copy all and CSS views. */
export function useSectionCss(id: ExportModule): string {
  const s = useProject()
  return useMemo(() => exportSections(pickData(s)).find((x) => x.id === id)?.css ?? '', [id, s.settings, s.tokenOverrides, s.tokenAlpha, s.type, s.grid, s.spacing, s.elevation, s.imported, s.schemaId]) // eslint-disable-line react-hooks/exhaustive-deps
}
