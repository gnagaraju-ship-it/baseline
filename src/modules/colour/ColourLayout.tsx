import type { ReactNode } from 'react'
import { AppShell } from '../../components/AppShell'
import { TopBar, type ViewTab } from '../../components/TopBar'
import { useProject } from '../../store/project'
import { SettingsPanel } from './SettingsPanel'
import { useResolvedTokens } from './useResolvedTokens'
import { usePalettes } from './usePalettes'

interface Props {
  /** Route of the current view tab, e.g. "/" or "/tokens". */
  current: string
  exportCount: number
  onCopyAll: () => void
  onExport: () => void
  children: ReactNode
}

/** Shared frame for the Colour views: rail + settings panel + view tabs + Copy all / Export. */
export function ColourLayout({ current, exportCount, onCopyAll, onExport, children }: Props) {
  const { palettes, rows } = usePalettes()
  const { resolvedCount } = useResolvedTokens()
  const copied = useProject((s) => s.copied)
  const failed = useProject((s) => s.copyFailed)

  const tabs: ViewTab[] = [
    { to: '/', label: 'Palette', icon: 'color', count: palettes.length },
    { to: '/tokens', label: 'Tokens', icon: 'tokens', count: resolvedCount },
    { to: '/contrast', label: 'Contrast grid', icon: 'contrast' },
    { to: '/preview', label: 'UI preview', icon: 'eye' }
  ]

  return (
    <AppShell panel={<SettingsPanel palettes={palettes} rows={rows} />}>
      <TopBar tabs={tabs} current={current} copyLabel={copied ? 'Copied' : failed ? 'Copy failed' : 'Copy all'} exportCount={exportCount} onCopyAll={onCopyAll} onExport={onExport} />
      {children}
    </AppShell>
  )
}
