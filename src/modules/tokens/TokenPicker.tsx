import { useEffect } from 'react'
import { Icon } from '../../components/Icon'
import type { Palette } from '../../lib/colour'
import { lcFor, paintFor, pickerChips, refLabel, type Mode, type ResolvedToken } from '../../lib/tokens'
import { useProject } from '../../store/project'

export function cellId(name: string, mode: Mode): string {
  return `tok-${name}-${mode}`
}

interface Props {
  token: ResolvedToken
  mode: Mode
  palettes: Palette[]
}

export function TokenPicker({ token, mode, palettes }: Props) {
  const { def } = token
  const cell = token[mode]
  const pickerPalette = useProject((s) => s.pickerPalette)
  const setPickerPalette = useProject((s) => s.setPickerPalette)
  const setTokenOverride = useProject((s) => s.setTokenOverride)
  const closePicker = useProject((s) => s.closePicker)

  const chips = pickerChips(palettes)
  const wanted = pickerPalette ?? cell.palette
  const active = chips.some((c) => c.key === wanted) ? wanted : chips[0].key

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      closePicker()
      document.getElementById(cellId(def.name, mode))?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closePicker, def.name, mode])

  return (
    <div className="flex justify-end px-4 pb-[18px] pt-1">
      <div role="dialog" aria-label={`${def.name}, ${mode} mode`} className="flex w-[min(560px,100%)] flex-col gap-3 rounded-xl border border-line bg-white p-3.5 shadow-[0_12px_32px_rgba(24,24,27,.14)]">
        <div className="flex items-center gap-2">
          <span className="flex-1 font-mono text-[13px] font-semibold">{def.name}</span>
          <span className="rounded-[5px] border border-line px-1.5 py-[3px] text-[10px] font-semibold tracking-[.08em] text-muted">{mode.toUpperCase()}</span>
          <button type="button" onClick={() => { closePicker(); document.getElementById(cellId(def.name, mode))?.focus() }} aria-label="Close picker" className="flex h-8 w-8 items-center justify-center rounded-[7px] border-0 bg-soft text-ink-3">
            <Icon name="close" size={14} strokeWidth={2} />
          </button>
        </div>
        <div role="group" aria-label="Palette" className="flex flex-wrap gap-1.5">
          {chips.map((c) => {
            const on = c.key === active
            return (
              <button key={c.key} type="button" aria-pressed={on} onClick={() => setPickerPalette(c.key)} className={`h-7 rounded-full border px-2.5 text-xs ${on ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-3'}`}>
                {c.label}
              </button>
            )
          })}
        </div>
        <div className="grid grid-cols-8 gap-2">
          {Array.from({ length: 16 }, (_, i) => {
            const paint = paintFor(active, i, palettes)
            const lc = paint ? lcFor(def.kind, mode, paint.hex, palettes) : null
            const selected = active === cell.palette && i === cell.index
            return (
              <button
                key={i}
                type="button"
                aria-label={`${refLabel(`${active}-${i + 1}`)}`}
                aria-pressed={selected}
                onClick={() => setTokenOverride(def.name, mode, `${active}-${i + 1}`)}
                className="flex flex-col items-center gap-[3px] rounded-[9px] bg-white p-1"
                style={{ border: `2px solid ${selected ? '#18181B' : 'transparent'}` }}
              >
                <span className="h-[34px] w-full rounded-md shadow-[inset_0_0_0_1px_rgba(0,0,0,.08)]" style={{ background: paint?.css }} />
                <span className="text-[11px] font-semibold text-ink-2">{i + 1}</span>
                <span className="font-mono text-[10px] text-muted">{lc === null ? '–' : lc}</span>
              </button>
            )
          })}
        </div>
        <div className="border-t border-line-faint pt-2.5 font-mono text-xs text-muted">{cell.label}  →  {def.name} ({mode})</div>
      </div>
    </div>
  )
}
