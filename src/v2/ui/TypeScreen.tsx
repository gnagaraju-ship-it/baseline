import { useMemo, useState } from 'react'
import { NumberField } from '../../components/NumberField'
import { fontStack } from '../../lib/typeScale'
import { refOf } from '../model'
import { activeResolved, useV2 } from '../store'
import { stepPath, typeRows, type TypeRow } from '../typeScale'

const label10 = 'text-[10.5px] font-semibold tracking-[.06em] text-muted'

function Row({ row, size, open, onToggle, fixedSize, hasTrack, family }: { row: TypeRow; size: number; open: boolean; onToggle: () => void; fixedSize: number; hasTrack: boolean; family: string }) {
  const setStep = useV2((s) => s.setStep)
  const changed = size !== fixedSize
  return (
    <div className="overflow-hidden rounded-[10px] border border-line bg-surface">
      <button type="button" onClick={onToggle} aria-expanded={open} aria-label={`${row.name}, ${row.size}px, line ${row.lh}px`} className="grid min-h-16 w-full grid-cols-[180px_minmax(0,1fr)_auto] items-center gap-4 border-0 bg-surface px-4 py-3 text-left hover:bg-panel">
        <span className="font-mono text-sm text-muted">{row.name}{changed && <span className="ml-1.5 rounded-[5px] bg-accent-tint px-1.5 py-px text-[10px] font-semibold text-accent-text">changed</span>}</span>
        <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ fontFamily: fontStack(family), fontSize: row.size, lineHeight: `${row.lh}px`, fontWeight: row.weight }}>The quick brown fox</span>
        <span className="flex gap-4 font-mono text-[13px] font-bold">
          <span>{row.size}px</span><span>{row.lh}px</span>{hasTrack && <span>{row.tr}em</span>}
        </span>
      </button>
      {open && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 border-t border-line bg-accent-wash px-4 pb-4 pt-3.5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`sz-${row.name}`} className={label10}>SIZE (PX)</label>
            <NumberField id={`sz-${row.name}`} value={row.size} min={8} onCommit={(n) => setStep(row.name, { size: n ?? undefined })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`lh-${row.name}`} className={label10}>LINE HEIGHT (PX)</label>
            <NumberField id={`lh-${row.name}`} value={row.lh} min={8} onCommit={(n) => setStep(row.name, { lh: n ?? undefined })} />
          </div>
          {hasTrack && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`tr-${row.name}`} className={label10}>LETTER SPACING (EM)</label>
              <NumberField id={`tr-${row.name}`} value={row.tr} step={0.001} onCommit={(n) => setStep(row.name, { tr: n ?? undefined })} />
            </div>
          )}
          <button type="button" onClick={() => setStep(row.name, { size: undefined, lh: undefined, tr: undefined })} className="h-8 self-end rounded-lg border border-line bg-surface px-3 text-xs">Reset this step</button>
        </div>
      )}
    </div>
  )
}

/** The type of the active system: its named steps with sizes and line heights, whether made from a scale or written down. */
export function TypeScreen() {
  const s = useV2()
  const r = useMemo(() => activeResolved(s), [s.themes, s.activeSystemId, s.activeThemeId]) // eslint-disable-line react-hooks/exhaustive-deps
  const [open, setOpen] = useState<string | null>(null)
  const setup = r.system.type
  if (!setup) return <p role="status" className="m-0 p-7 text-[13px] text-muted">This design system has no type.</p>
  const rows = typeRows(setup, r.theme.type)
  const start = typeRows(setup, undefined)
  const groups = [...new Set(rows.map((x) => x.group))]
  const fam = (f: 'heading' | 'body') => String(r.find(refOf(setup.collection, f === 'heading' ? setup.paths.headingFont : setup.paths.bodyFont))?.cells.value.value ?? '')
  return (
    <div className="flex flex-col gap-7 px-7 pb-12 pt-5">
      <p className="m-0 text-[13px] text-muted">{setup.kind === 'scale' ? 'Sizes come from the base size and ratio in the panel. Open a step to set one yourself.' : 'These steps have the sizes of the design system. Open a step to change one; its line height follows in proportion.'}</p>
      {groups.map((g) => (
        <section key={g} aria-label={g} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2.5">
              <h2 className="m-0 text-xs font-bold tracking-[.08em]">{g}</h2>
              <span className="text-xs text-muted">{fam(rows.find((x) => x.group === g)!.font)}</span>
            </div>
            <span className="font-mono text-[11px] text-muted">{rows.filter((x) => x.group === g).length} steps</span>
          </div>
          {rows.filter((x) => x.group === g).map((row) => (
            <Row key={row.name} row={row} size={row.size} fixedSize={start.find((x) => x.name === row.name)!.size} open={open === row.name} onToggle={() => setOpen(open === row.name ? null : row.name)} hasTrack={!!stepPath(setup, 'track', row.name)} family={fam(row.font)} />
          ))}
        </section>
      ))}
    </div>
  )
}
