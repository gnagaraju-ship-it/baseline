import type { ReactNode } from 'react'
import { AppShell } from '../../components/AppShell'
import { Icon } from '../../components/Icon'
import { ElevationSettingsPanel } from './ElevationSettingsPanel'

interface Props {
  exportCount: number
  onExport: () => void
  children: ReactNode
}

/** Frame for the Elevation screen: rail + elevation settings + Scale tab and Export. */
export function ElevationLayout({ exportCount, onExport, children }: Props) {
  return (
    <AppShell panel={<ElevationSettingsPanel />}>
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-line-soft pl-7 pr-6">
        <nav aria-label="Views" className="flex">
          <span aria-current="page" className="flex h-16 items-center px-3.5 font-semibold text-ink shadow-[inset_0_-2px_0_#E2531B]">Scale</span>
        </nav>
        <div className="py-2.5">
          <button type="button" onClick={onExport} className="flex h-10 items-center gap-2 rounded-[9px] border-0 bg-btn pl-3.5 pr-2.5 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(210,64,11,.3)]">
            <Icon name="export" size={15} strokeWidth={1.8} />
            Export
            <span className="inline-flex h-5 items-center rounded-[5px] bg-white/20 px-1.5 text-[11px] font-semibold">{exportCount}</span>
          </button>
        </div>
      </div>
      {children}
    </AppShell>
  )
}
