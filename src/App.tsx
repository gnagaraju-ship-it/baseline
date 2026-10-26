import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { ExportDialog } from './components/ExportDialog'
import { titleFor } from './lib/titles'
import { useProject } from './store/project'
import { ContrastPage } from './modules/contrast/ContrastPage'
import { PalettePage } from './modules/palette/PalettePage'
import { PreviewPage } from './modules/preview/PreviewPage'
import { TypePage } from './modules/type/TypePage'
import { GridsPage } from './modules/grids/GridsPage'
import { SpacingPage } from './modules/spacing/SpacingPage'
import { ElevationPage } from './modules/elevation/ElevationPage'
import { NotFoundPage } from './modules/NotFoundPage'
import { TokensPage } from './modules/tokens/TokensPage'
import { IMPORTED_ROUTES, ImportedPage } from './modules/imported/ImportedPage'

export default function App() {
  const { pathname } = useLocation()
  const appTheme = useProject((s) => s.appTheme)
  const imported = useProject((s) => !!s.imported)
  useEffect(() => {
    document.documentElement.dataset.theme = appTheme
  }, [appTheme])
  useEffect(() => {
    document.title = titleFor(pathname)
  }, [pathname])

  return (
    <>
    {imported && IMPORTED_ROUTES.includes(pathname) ? <ImportedPage /> : (
    <Routes>
      <Route path="/" element={<PalettePage />} />
      <Route path="/tokens" element={<TokensPage />} />
      <Route path="/contrast" element={<ContrastPage />} />
      <Route path="/preview" element={<PreviewPage />} />
      <Route path="/type" element={<TypePage />} />
      <Route path="/grids" element={<GridsPage />} />
      <Route path="/spacing" element={<SpacingPage />} />
      <Route path="/elevation" element={<ElevationPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    )}
    <ExportDialog />
    </>
  )
}
