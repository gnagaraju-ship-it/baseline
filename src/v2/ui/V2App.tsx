import { useLocation } from 'react-router-dom'
import { PaletteScreen } from './PaletteScreen'
import { TokensScreen } from './TokensScreen'
import { V2Shell } from './V2Shell'

/** Everything under /v2. */
export function V2App() {
  const { pathname } = useLocation()
  return <V2Shell>{pathname.startsWith('/v2/tokens') ? <TokensScreen /> : <PaletteScreen />}</V2Shell>
}
