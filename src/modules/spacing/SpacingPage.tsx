import { useState, type FormEvent } from 'react'
import { downloadText } from '../../lib/browser'
import { BREAKPOINTS } from '../../lib/grid'
import {
  barWidth, formatSpacing, onValues, parseCustom, scaleSteps, spacingBreakpoints, spacingTokens, toSpacingCss
} from '../../lib/spacing'
import { useProject } from '../../store/project'
import { SpacingLayout } from './SpacingLayout'

const card = 'flex flex-col rounded-[14px] border border-line px-6 py-5'
const head = 'text-[11px] font-semibold tracking-[.08em] text-muted'

export function SpacingPage() {
  const { spacing, grid, unit, toggleSpacingStep, addSpacingValue } = useProject()
  const [draft, setDraft] = useState('')
  const [invalid, setInvalid] = useState(false)

  const steps = scaleSteps(spacing.base, spacing.extra)
  const enabled = onValues(steps, spacing.on)
  const bps = spacingBreakpoints(spacing, grid)
  const groups = spacingTokens(grid, bps, enabled)

  const spacingCss = toSpacingCss(enabled, groups)

  function add(e: FormEvent) {
    e.preventDefault()
    const v = parseCustom(draft)
    if (v === null) return setInvalid(true)
    addSpacingValue(v)
    setDraft('')
    setInvalid(false)
  }

  return (
    <SpacingLayout css={spacingCss} exportCount={enabled.length} onExport={() => downloadText('spacing.css', spacingCss)}>
      <div className="flex flex-col gap-5 px-7 pb-12 pt-6">
        <section aria-label="Scale" className={`${card} gap-4`}>
          <div>
            <h2 className="m-0 mb-1 text-base font-semibold">Scale</h2>
            <p className="m-0 text-[13px] text-muted">Toggle a value on or off — the token name on the right is what it exports as. {enabled.length} of {steps.length} on.</p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-8 gap-y-1">
            {steps.map((v) => {
              const on = !!spacing.on[v]
              return (
                <div key={v} className="flex min-h-10 items-center gap-2.5 border-b border-line-faint">
                  <input type="checkbox" id={`sp-${v}`} checked={on} onChange={() => toggleSpacingStep(v)} className="m-0 h-[18px] w-[18px] accent-accent" />
                  <label htmlFor={`sp-${v}`} className={`flex-1 font-mono text-sm ${on ? 'font-bold text-ink' : 'text-subtle'}`}>{formatSpacing(v, unit)}</label>
                  <span aria-hidden="true" className="h-2 rounded-sm" style={{ width: barWidth(v), background: on ? 'var(--color-accent-bar)' : 'var(--color-line)' }} />
                  <span className={`w-[76px] text-right font-mono text-[11px] ${on ? 'text-muted' : 'text-subtle'}`}>space-{v}</span>
                </div>
              )
            })}
          </div>
          <form noValidate onSubmit={add} className="flex items-center gap-2">
            <label htmlFor="custom-px" className="sr-only">Custom value in px</label>
            <input id="custom-px" type="number" min={0} max={400} placeholder="+ custom px" value={draft} aria-invalid={invalid} onChange={(e) => { setDraft(e.target.value); setInvalid(false) }} className={`inp h-9 w-[150px] font-mono ${invalid ? 'border-danger' : ''}`} />
            <button type="submit" className="h-9 rounded-lg border border-line bg-surface px-3 text-[13px]">Add</button>
            {invalid && <span role="alert" className="text-xs text-danger">Enter a whole number from 0 to 400.</span>}
          </form>
        </section>

        <section aria-label="Tokens" className={`${card} gap-3.5`}>
          <div>
            <h2 className="m-0 mb-1 text-base font-semibold">Tokens</h2>
            <p className="m-0 text-[13px] text-muted">Grouped the way Figma Variables groups by name. Values not on the scale are flagged.</p>
          </div>
          <div className="overflow-x-auto">
            <div role="table" aria-label="Spacing tokens" className="min-w-[600px]">
              <div role="row" className={`${head} grid border-b border-line py-2`} style={{ gridTemplateColumns: `minmax(0,1.4fr) repeat(${bps.length}, minmax(0,1fr))` }}>
                <span role="columnheader">TOKEN</span>
                {bps.map((k) => <span key={k} role="columnheader" className="text-center">{BREAKPOINTS.find((b) => b.key === k)!.label}</span>)}
              </div>
              {groups.map((g) => (
                <div key={g.name} role="rowgroup" aria-label={g.name}>
                  <div className={`${head} pb-1 pt-3.5`}>{g.name}</div>
                  {g.rows.map((r) => (
                    <div key={r.name} role="row" className="grid min-h-[38px] items-center border-b border-line-faint" style={{ gridTemplateColumns: `minmax(0,1.4fr) repeat(${bps.length}, minmax(0,1fr))` }}>
                      <span role="rowheader" className="font-mono text-[13px]">{r.name}</span>
                      {r.cells.map((c) => (
                        <span key={c.bp} role="cell" className="flex items-center justify-center gap-1.5">
                          <span className="font-mono text-[13px]" style={{ color: c.offScale ? 'var(--color-warn-text)' : 'var(--color-ink)' }}>{formatSpacing(c.value, unit)}</span>
                          {c.offScale && <span className="rounded bg-warn-chip px-[5px] py-px text-[10px] font-semibold text-warn-text">off-scale</span>}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </SpacingLayout>
  )
}
