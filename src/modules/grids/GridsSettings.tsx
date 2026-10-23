import { NumberField } from '../../components/NumberField'
import { BREAKPOINTS, GRID_PRESETS, breakpoint, type GridPresetKey } from '../../lib/grid'
import { useProject } from '../../store/project'

const h3 = 'm-0 text-xs font-semibold uppercase tracking-[.08em] text-muted'
const pill = (on: boolean) => `h-[30px] rounded-full border px-3 text-xs font-medium ${on ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface text-ink-3'}`
const label11 = 'text-[11px] font-semibold tracking-[.06em] text-muted'

const PLATFORMS: Array<[string, string]> = [
  ['Website', 'M3 5h18v12H3zM8 21h8M12 17v4'],
  ['Web app', 'M3 4h18v16H3zM9 4v16'],
  ['Tablet', 'M6 3h12v18H6zM11 18h2'],
  ['Phone', 'M8 3h8v18H8zM11 18h2']
]
const FLAGS = [['sidebar', 'Sidebar'], ['floating', 'Floating'], ['maxWidth', 'Max content width']] as const
const PRESETS: GridPresetKey[] = ['standard', 'dense', 'airy', 'custom']

export function GridsSettings() {
  const s = useProject()
  const g = s.grid
  const active = breakpoint(g.active)
  const onCount = BREAKPOINTS.filter((b) => g.on[b.key]).length

  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-night"><span className="h-3 w-3 rounded-[3px] bg-[#FF5A1F]" /></div>
        <div className="text-base font-semibold">Grids</div>
      </div>

      <div className="flex flex-col gap-[22px] p-5">
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h3 className={h3}>Platform</h3>
            <span className="rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold tracking-[.06em] text-muted">PROJECT</span>
          </div>
          <div role="group" aria-label="Platform" className="grid grid-cols-4 gap-1 rounded-[10px] border border-line bg-surface p-1">
            {PLATFORMS.map(([label, d], i) => {
              const on = g.platform === i
              return (
                <button key={label} type="button" aria-label={label} aria-pressed={on} title={label} onClick={() => s.setGridPlatform(i)} className={`flex h-9 items-center justify-center rounded-[7px] border ${on ? 'border-accent-ring bg-accent-tint text-accent-text' : 'border-transparent bg-transparent text-muted'}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
                </button>
              )
            })}
          </div>
        </section>

        <section className="flex flex-col gap-2.5">
          <h3 className={h3}>Layout</h3>
          {FLAGS.map(([flag, label]) => (
            <div key={flag} className="flex min-h-8 items-center justify-between">
              <span id={`tg-${flag}`} className="text-[13px]">{label}</span>
              <button type="button" role="switch" aria-checked={g[flag]} aria-labelledby={`tg-${flag}`} onClick={() => s.toggleGridFlag(flag)} className={`flex h-5 w-9 rounded-full border-0 p-0.5 ${g[flag] ? 'justify-end bg-accent' : 'justify-start bg-edge'}`}>
                <span className="h-4 w-4 rounded-full bg-surface shadow-[0_1px_2px_rgba(0,0,0,.2)]" />
              </button>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-2.5">
          <h3 className={h3}>Presets</h3>
          <div role="group" aria-label="Preset" className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button key={p} type="button" aria-pressed={g.preset === p} onClick={() => s.applyGridPreset(p)} className={pill(g.preset === p)}>
                {p === 'custom' ? 'Custom' : GRID_PRESETS[p].label}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2.5">
          <div className="flex justify-between"><h3 className={h3}>Breakpoints</h3><span className="text-[11px] text-muted">{onCount} ON</span></div>
          {BREAKPOINTS.map((b) => (
            <div key={b.key} className="flex min-h-9 items-center gap-2.5">
              <input type="checkbox" id={`bp-${b.key}`} checked={g.on[b.key]} onChange={() => s.toggleBreakpoint(b.key)} className="m-0 h-[18px] w-[18px] accent-accent" />
              <label htmlFor={`bp-${b.key}`} className="flex-1 text-[13px] font-medium">{b.label}</label>
              <span className="font-mono text-[13px]">{b.width}</span>
              <span className="text-[11px] text-muted">px</span>
            </div>
          ))}
          <button type="button" disabled title="Custom breakpoints — not in v1" className="h-[34px] self-start rounded-lg border border-line bg-surface px-3 text-xs text-ink-3 opacity-60">+ Add breakpoint or device</button>
        </section>

        <section className="flex flex-col gap-2.5">
          <div className="flex justify-between"><h3 className={h3}>Grid</h3><span className="text-[11px] font-semibold text-accent-text">{active.label}</span></div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="g-cols" className={label11}>COLUMNS</label>
              <NumberField id="g-cols" value={g.columns[g.active]} min={1} max={24} className="w-full" onCommit={(n) => n !== null && s.setGridColumns(n)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="g-gut" className={label11}>GUTTER (PX)</label>
              <NumberField id="g-gut" value={g.gutter[g.active]} min={0} max={96} className="w-full" onCommit={(n) => n !== null && s.setGridGutter(n)} />
            </div>
          </div>
        </section>
      </div>
      <div className="flex-1" />
      <div className="border-t border-line px-5 py-4 text-[13px] text-muted">Omni by Canvs</div>
    </>
  )
}
