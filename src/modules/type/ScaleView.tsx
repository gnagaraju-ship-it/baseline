import { useState } from 'react'
import {
  WEIGHTS, effectiveUnit, formatSize, isWeb, rowFamily, trackingLabel, type TypeGroup, type TypeRow, type TypeSettings
} from '../../lib/typeScale'
import { useProject } from '../../store/project'
import { NumberField } from '../../components/NumberField'

const GRID = 'grid grid-cols-[180px_minmax(0,1fr)_auto_24px] items-center gap-4'
const label10 = 'text-[10.5px] font-semibold tracking-[.06em] text-muted'

function Row({ row, settings, open, onToggle }: { row: TypeRow; settings: TypeSettings; open: boolean; onToggle: () => void }) {
  const { unit, setTypeOverride, resetTypeOverride, toggleVariant } = useProject()
  const web = isWeb(settings.platform)
  const u = effectiveUnit(unit, settings.platform)
  const family = rowFamily(settings, row)
  const sampleStyle = { fontFamily: family, fontSize: row.size, lineHeight: `${row.lh}px`, letterSpacing: `${row.tr}em` }
  const chosen = settings.variants[row.name] ?? []

  return (
    <div className="overflow-hidden rounded-[10px] border bg-surface" style={{ borderColor: open ? 'var(--color-accent-ring-strong)' : 'var(--color-line)', boxShadow: open ? '0 0 0 3px var(--color-accent-band)' : 'none' }}>
      <button type="button" onClick={onToggle} aria-expanded={open} className={`${GRID} min-h-16 w-full border-0 px-4 py-3 text-left hover:bg-panel ${open ? 'bg-accent-wash' : 'bg-surface'}`}>
        <span className="font-mono text-sm text-muted">{row.name}</span>
        <span className="overflow-hidden text-ellipsis whitespace-nowrap text-ink" style={{ ...sampleStyle, fontWeight: row.weight }}>The quick brown fox</span>
        <span className="grid grid-cols-3 gap-x-3.5 text-right">
          <span className="font-mono text-[13px] font-bold">{formatSize(row.size, u, web)}</span>
          <span className="font-mono text-[13px] font-bold">{row.lh}px</span>
          <span className="font-mono text-[13px] font-bold">{trackingLabel(row.tr)}</span>
          <span className="font-mono text-[9.5px] tracking-[.06em] text-muted">SIZE</span>
          <span className="font-mono text-[9.5px] tracking-[.06em] text-muted">LINE-H</span>
          <span className="font-mono text-[9.5px] tracking-[.06em] text-muted">TRACK</span>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-muted" style={{ transform: open ? 'rotate(90deg)' : 'none' }}><path d="M9 6l6 6-6 6" /></svg>
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-accent-edge bg-accent-wash px-4 pb-4 pt-3.5">
          {!settings.fixed && <div className="text-[10.5px] font-bold tracking-[.08em] text-muted">WEIGHT VARIANTS</div>}
          {!settings.fixed && <div role="group" aria-label="Weight variants" className="flex flex-wrap gap-1.5">
            {WEIGHTS.map(([name, w]) => {
              const on = chosen.includes(w)
              return (
                <button key={w} type="button" aria-pressed={on} onClick={() => toggleVariant(row.name, w)} className={`flex h-[30px] items-center gap-1.5 rounded-full border px-3 text-xs font-semibold ${on ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface text-ink-3'}`}>
                  {name}<span className="font-mono font-normal opacity-75">{w}</span>
                </button>
              )
            })}
          </div>}
          <div className="text-[10.5px] font-bold tracking-[.08em] text-muted">OVERRIDES</div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
            {settings.fixed && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`sz-${row.name}`} className={label10}>SIZE (PX)</label>
                <NumberField id={`sz-${row.name}`} value={settings.overrides[row.name]?.size ?? settings.fixed.find((x) => x.name === row.name)?.size ?? row.size} min={8} onCommit={(n) => setTypeOverride(row.name, { size: n ?? undefined })} />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`lh-${row.name}`} className={label10}>LINE HEIGHT (PX)</label>
              <NumberField id={`lh-${row.name}`} value={row.lh} min={8} onCommit={(n) => setTypeOverride(row.name, { lh: n ?? undefined })} />
            </div>
            {!settings.fixed && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`tr-${row.name}`} className={label10}>LETTER SPACING (EM)</label>
                <NumberField id={`tr-${row.name}`} value={row.tr} step={0.001} onCommit={(n) => setTypeOverride(row.name, { tr: n ?? undefined })} />
              </div>
            )}
          </div>
          {row.overridden && (
            <button type="button" onClick={() => resetTypeOverride(row.name)} className="self-start border-0 bg-transparent py-1 text-xs font-semibold text-accent-text">Reset to scale</button>
          )}
        </div>
      )}

      {row.variants.map((v) => (
        <div key={v.name} className={`${GRID} border-t border-line-faint bg-panel py-2.5 pl-9 pr-4`}>
          <span className="font-mono text-xs text-muted">{v.name}</span>
          <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ ...sampleStyle, fontWeight: v.weight }}>The quick brown fox</span>
          <span className="text-right font-mono text-xs font-semibold">{formatSize(row.size, u, web)} · {row.lh}px · {v.weight}</span>
          <span />
        </div>
      ))}
    </div>
  )
}

export function ScaleView({ groups, settings }: { groups: TypeGroup[]; settings: TypeSettings }) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {}
    if (isWeb(settings.platform) && !settings.fixed) o['heading-xl'] = true
    return o
  })
  return (
    <div className="flex flex-col gap-7">
      {groups.map((g) => (
        <section key={g.title} aria-label={g.title} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2.5">
              <h2 className="m-0 text-xs font-bold tracking-[.08em]">{g.title}</h2>
              <span className="text-xs text-muted">{g.font}</span>
            </div>
            <span className="font-mono text-[11px] text-muted">{g.rows.length} steps</span>
          </div>
          {g.rows.map((r) => (
            <Row key={r.name} row={r} settings={settings} open={!!open[r.name]} onToggle={() => setOpen((o) => ({ ...o, [r.name]: !o[r.name] }))} />
          ))}
        </section>
      ))}
    </div>
  )
}
