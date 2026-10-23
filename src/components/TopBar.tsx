import { NavLink } from 'react-router-dom'
import { Icon, type IconName } from './Icon'

export interface ViewTab {
  to: string
  label: string
  icon: IconName
  count?: number
}

interface Props {
  tabs: ViewTab[]
  current: string
  copyLabel: string
  exportCount: number
  onCopyAll: () => void
  onExport: () => void
}

export function TopBar({ tabs, current, copyLabel, exportCount, onCopyAll, onExport }: Props) {
  return (
    <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-line-soft pl-7 pr-6">
      <nav aria-label="Views" className="flex flex-wrap gap-1">
        {tabs.map((t) => {
          const active = t.to === current
          return (
            <NavLink
              key={t.to}
              to={t.to}
              aria-current={active ? 'page' : undefined}
              className={`flex h-16 items-center gap-2 px-3.5 no-underline ${active ? 'font-semibold text-ink shadow-[inset_0_-2px_0_#E2531B]' : 'font-medium text-muted hover:text-ink'}`}
            >
              <Icon name={t.icon} size={16} strokeWidth={1.7} />
              {t.label}
              {t.count !== undefined && (
                <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 text-[11px] font-semibold ${active ? 'bg-accent-tint text-accent-text' : 'bg-soft text-muted'}`}>{t.count}</span>
              )}
            </NavLink>
          )
        })}
      </nav>
      <div className="flex gap-2 py-2.5">
        <button type="button" onClick={onCopyAll} className="flex h-10 items-center gap-2 rounded-[9px] border border-line bg-white px-3.5 text-[13px] font-medium text-ink">
          <Icon name="copy" size={15} strokeWidth={1.7} />
          {copyLabel}
        </button>
        <button type="button" onClick={onExport} className="flex h-10 items-center gap-2 rounded-[9px] border-0 bg-btn pl-3.5 pr-2.5 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(210,64,11,.3)]">
          <Icon name="export" size={15} strokeWidth={1.8} />
          Export
          <span className="inline-flex h-5 items-center rounded-[5px] bg-white/20 px-1.5 text-[11px] font-semibold">{exportCount}</span>
        </button>
      </div>
    </div>
  )
}
