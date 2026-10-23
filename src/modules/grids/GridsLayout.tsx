import type { ReactNode } from 'react'
import { AppShell } from '../../components/AppShell'
import { CopyAllButton } from '../../components/CopyAllButton'
import { Icon } from '../../components/Icon'
import { UnitSwitch } from '../../components/UnitSwitch'
import { useProject } from '../../store/project'
import { GridsSettings } from './GridsSettings'

interface Props {
  /** The module's CSS, copied by Copy all. */
  css: string
  /** Number shown next to the Grid tab (the active breakpoint's columns). */
  columns: number
  exportCount: number
  onExport: () => void
  children: ReactNode
}

/** Frame for the Grids screen: rail + grid settings + Grid tab, unit switch and Export. */
export function GridsLayout({ css, columns, exportCount, onExport, children }: Props) {
  const unit = useProject((s) => s.unit)
  const setUnit = useProject((s) => s.setUnit)
  return (
    <AppShell panel={<GridsSettings />}>
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-line-soft pl-7 pr-6">
        <nav aria-label="Views" className="flex gap-1">
          <span aria-current="page" className="flex h-16 items-center gap-2 px-3.5 font-semibold text-ink shadow-[inset_0_-2px_0_#E2531B]">
            <Icon name="grid" size={16} strokeWidth={1.7} />
            Grid
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-accent-tint px-1.5 text-[11px] font-semibold text-accent-text">{columns}</span>
          </span>
        </nav>
        <div className="flex items-center gap-2 py-2.5">
          <UnitSwitch units={['rem', 'px', 'pt']} shown={unit} onChange={setUnit} />
          <CopyAllButton css={css} />
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
