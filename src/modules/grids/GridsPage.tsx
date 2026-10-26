import { BREAKPOINTS, computeGrid, gridDescription, gridStats, gridTitle, sidebarChip, toGridCss } from '../../lib/grid'
import { useProject } from '../../store/project'
import { GridOverlay } from './GridOverlay'
import { GridsLayout } from './GridsLayout'

export function GridsPage() {
  const openExport = useProject((s) => s.openExport)
  const grid = useProject((s) => s.grid)
  const unit = useProject((s) => s.unit)
  const setActive = useProject((s) => s.setActiveBreakpoint)
  const layout = computeGrid(grid, grid.active)
  const enabled = BREAKPOINTS.filter((b) => grid.on[b.key])
  const chip = sidebarChip(layout, grid, unit)

  return (
    <GridsLayout css={toGridCss(grid)} columns={layout.columns} exportCount={enabled.length} onExport={() => openExport(['grids'])}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line-faint px-7 py-3">
        <span className="mr-1.5 text-[11px] font-semibold tracking-[.08em] text-muted">BREAKPOINT</span>
        <div role="group" aria-label="Breakpoint" className="flex flex-wrap gap-2">
          {enabled.map((b) => {
            const on = grid.active === b.key
            return (
              <button key={b.key} type="button" aria-pressed={on} onClick={() => setActive(b.key)} className={`flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold ${on ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface text-ink-3'}`}>
                {b.label}<span className="font-mono font-normal opacity-80">{b.width}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-[18px] px-7 pb-12 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="m-0 mb-1.5 text-[22px] font-semibold tracking-[-0.01em]">{gridTitle(layout, grid.sidebar)}</h1>
            <p className="m-0 text-[13px] text-muted">{gridDescription(layout, grid, unit)}</p>
          </div>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-xs text-ink-3">Sidebar: {chip.state} <span className="font-mono text-muted">{chip.width}</span></span>
        </div>

        <GridOverlay layout={layout} unit={unit} floating={grid.floating} />

        <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] overflow-hidden rounded-xl border border-line">
          {gridStats(layout, unit).map((s) => (
            <div key={s.k} className="flex flex-col gap-1 border-r border-line-faint px-3.5 py-3">
              <dt className="text-[11px] font-semibold tracking-[.06em] text-muted">{s.k}</dt>
              <dd className={`m-0 font-mono text-[15px] font-semibold ${s.accent ? 'text-accent-text' : 'text-ink'}`}>{s.v}</dd>
            </div>
          ))}
        </dl>

      </div>
    </GridsLayout>
  )
}
