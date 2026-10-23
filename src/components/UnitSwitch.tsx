import type { Unit } from '../lib/typeScale'

interface Props {
  units: readonly Unit[]
  shown: Unit
  onChange: (u: Unit) => void
}

/** rem / px / pt switch shared by Type, Grids and Spacing. */
export function UnitSwitch({ units, shown, onChange }: Props) {
  return (
    <div role="group" aria-label="Unit" className="inline-flex gap-0.5 rounded-[9px] border border-line p-[3px]">
      {units.map((u) => (
        <button key={u} type="button" aria-pressed={shown === u} onClick={() => onChange(u)} className={`h-[30px] rounded-md border-0 px-2.5 font-mono text-xs ${shown === u ? 'bg-soft text-ink' : 'bg-transparent text-muted'}`}>
          {u}
        </button>
      ))}
    </div>
  )
}
