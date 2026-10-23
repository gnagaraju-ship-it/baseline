import type { ReactNode } from 'react'
import { AppShell } from '../../components/AppShell'
import { CopyAllButton } from '../../components/CopyAllButton'
import { Icon } from '../../components/Icon'
import { UnitSwitch } from '../../components/UnitSwitch'
import { isWeb } from '../../lib/typeScale'
import { useProject } from '../../store/project'
import { TypeSettingsPanel } from './TypeSettingsPanel'

export type TypeTab = 'scale' | 'preview' | 'export'

interface Props {
  /** The module's CSS, copied by Copy all. */
  css: string
  tab: TypeTab
  onTab: (t: TypeTab) => void
  count: number
  onExport: () => void
  children: ReactNode
}

const TABS: Array<[TypeTab, string, 'type' | 'eye' | 'export']> = [['scale', 'Scale', 'type'], ['preview', 'Preview', 'eye'], ['export', 'Export', 'export']]

/** Frame for the Type screen: rail + type settings + Scale / Preview / Export tabs, unit switch and Export. */
export function TypeLayout({ css, tab, onTab, count, onExport, children }: Props) {
  const { unit, setUnit, type } = useProject()
  const web = isWeb(type.platform)
  const units = web ? (['rem', 'px', 'pt'] as const) : (['pt', 'px'] as const)
  const shown = !web && unit === 'rem' ? 'pt' : unit

  return (
    <AppShell panel={<TypeSettingsPanel />}>
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-line-soft pl-7 pr-6">
        <div role="tablist" aria-label="Views" className="flex gap-1">
          {TABS.map(([key, label, icon]) => {
            const on = tab === key
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => onTab(key)}
                className={`flex h-16 items-center gap-2 border-0 bg-transparent px-3.5 text-sm ${on ? 'font-semibold text-ink shadow-[inset_0_-2px_0_#E2531B]' : 'font-medium text-muted hover:text-ink'}`}
              >
                <Icon name={icon} size={16} strokeWidth={1.7} />
                {label}
                {key === 'scale' && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-accent-tint px-1.5 text-[11px] font-semibold text-accent-text">{count}</span>}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2 py-2.5">
          <UnitSwitch units={units} shown={shown} onChange={setUnit} />
          <CopyAllButton css={css} />
          <button type="button" onClick={onExport} className="flex h-10 items-center gap-2 rounded-[9px] border-0 bg-btn pl-3.5 pr-2.5 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(210,64,11,.3)]">
            <Icon name="export" size={15} strokeWidth={1.8} />
            Export
            <span className="inline-flex h-5 items-center rounded-[5px] bg-surface/20 px-1.5 text-[11px] font-semibold">{count}</span>
          </button>
        </div>
      </div>
      {children}
    </AppShell>
  )
}
