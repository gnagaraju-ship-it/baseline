import { BREAKPOINTS } from '../../lib/grid'
import { SPACING_BASES, spacingBreakpoints, type SpacingBase } from '../../lib/spacing'
import { useProject } from '../../store/project'

const h3 = 'm-0 text-xs font-semibold uppercase tracking-[.08em] text-muted'
const pill = (on: boolean) => `h-[30px] rounded-full border px-3 text-xs font-medium ${on ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface text-ink-3'}`

export function SpacingSettingsPanel() {
  const { spacing, grid, setSpacingBase, setSpacingSame, toggleSpacingBreakpoint } = useProject()
  const active = spacingBreakpoints(spacing, grid)

  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-night"><span className="h-3 w-3 rounded-[3px] bg-[#FF5A1F]" /></div>
        <div className="text-base font-semibold">Spacing</div>
      </div>

      <div className="flex flex-col gap-6 p-5">
        <section className="flex flex-col gap-2.5">
          <h3 className={h3}>Presets</h3>
          <div role="group" aria-label="Base unit" className="flex flex-wrap gap-1.5">
            {(Object.keys(SPACING_BASES) as SpacingBase[]).map((k) => (
              <button key={k} type="button" aria-pressed={spacing.base === k} onClick={() => setSpacingBase(k)} className={pill(spacing.base === k)}>{SPACING_BASES[k].label}</button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2.5">
          <div className="flex justify-between"><h3 className={h3}>Breakpoints</h3><span className="text-[11px] text-muted">{active.length} ON</span></div>
          <div className="flex items-center justify-between">
            <span id="same-grid" className="text-[13px] font-medium">Same as Grid</span>
            <button type="button" role="switch" aria-checked={spacing.same} aria-labelledby="same-grid" onClick={() => setSpacingSame(!spacing.same)} className={`flex h-5 w-9 rounded-full border-0 p-0.5 ${spacing.same ? 'justify-end bg-accent' : 'justify-start bg-edge'}`}>
              <span className="h-4 w-4 rounded-full bg-surface shadow-[0_1px_2px_rgba(0,0,0,.2)]" />
            </button>
          </div>
          <p className="m-0 text-xs leading-[1.55] text-muted">
            {spacing.same ? 'Reusing Grid’s breakpoints — turn this off to set independent ones.' : 'Independent breakpoints — choose which ones get spacing values.'}
          </p>
          {BREAKPOINTS.map((b) => (
            <div key={b.key} className="flex min-h-[34px] items-center gap-2.5">
              <input type="checkbox" id={`sbp-${b.key}`} checked={active.includes(b.key)} disabled={spacing.same} onChange={() => toggleSpacingBreakpoint(b.key)} className="m-0 h-[18px] w-[18px] accent-accent" />
              <label htmlFor={`sbp-${b.key}`} className="flex-1 text-[13px] font-medium">{b.label}</label>
              <span className="font-mono text-xs text-muted">{b.width}px</span>
            </div>
          ))}
        </section>
      </div>
      <div className="flex-1" />
      <div className="border-t border-line px-5 py-4 text-[13px] text-muted">Omni by Canvs</div>
    </>
  )
}
