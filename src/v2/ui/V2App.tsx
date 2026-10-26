import { useLocation } from 'react-router-dom'
import { ImportScreen } from './ImportScreen'
import { PaletteScreen } from './PaletteScreen'
import { SizesScreen } from './SizesScreen'
import { TokensScreen } from './TokensScreen'
import { TypeScreen } from './TypeScreen'
import { V2Shell } from './V2Shell'

/** Everything under /v2. */
export function V2App() {
  const { pathname } = useLocation()
  return <V2Shell>{pathname.startsWith('/v2/tokens') ? <TokensScreen /> : pathname.startsWith('/v2/type') ? <TypeScreen /> : pathname.startsWith('/v2/sizes') ? <SizesScreen /> : pathname.startsWith('/v2/import') ? <ImportScreen /> : <PaletteScreen />}</V2Shell>
}
