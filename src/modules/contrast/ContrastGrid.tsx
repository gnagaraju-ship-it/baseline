import type { KeyboardEvent } from 'react'
import type { Standard } from '../../lib/contrast'
import { cellText, meets, scoreFor, type GridColour } from '../../lib/contrastGrid'

interface Props {
  label: string
  colours: GridColour[]
  standard: Standard
  threshold: number
  cell: [number, number]
  onSelect: (row: number, col: number) => void
}

const COLS = 'grid grid-cols-[52px_repeat(18,minmax(0,1fr))] gap-0.5'
const chip = 'h-[18px] w-[18px] rounded-[5px] shadow-[inset_0_0_0_1px_rgba(0,0,0,.1)]'

export function ContrastGrid({ label, colours, standard, threshold, cell, onSelect }: Props) {
  const last = colours.length - 1

  function onKeyDown(e: KeyboardEvent, r: number, c: number) {
    const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
    let next: [number, number] | null = null
    if (moves[e.key]) next = [Math.min(last, Math.max(0, r + moves[e.key][0])), Math.min(last, Math.max(0, c + moves[e.key][1]))]
    else if (e.key === 'Home') next = [r, 0]
    else if (e.key === 'End') next = [r, last]
    if (!next) return
    e.preventDefault()
    onSelect(next[0], next[1])
    document.getElementById(`cg-${next[0]}-${next[1]}`)?.focus()
  }

  return (
    <div className="min-w-0 flex-[999_1_520px] overflow-x-auto rounded-[14px] border border-line bg-white p-3">
      <div role="grid" aria-label={label} className="flex min-w-[720px] flex-col gap-0.5">
        <div role="row" className={`${COLS} pb-1`}>
          <span />
          {colours.map((c) => (
            <span key={c.short} role="columnheader" aria-label={`Background ${c.label}`} className="flex flex-col items-center gap-1 text-[10px] text-muted">
              <span className={chip} style={{ background: `#${c.hex}` }} />
              {c.short}
            </span>
          ))}
        </div>
        {colours.map((r, ri) => (
          <div key={r.short} role="row" className={COLS}>
            <span role="rowheader" aria-label={`Text ${r.label}`} className="flex items-center justify-end gap-1.5 pr-1 text-[10px] text-muted">
              {r.label}
              <span className={chip} style={{ background: `#${r.hex}` }} />
            </span>
            {colours.map((c, ci) => {
              const same = ri === ci
              const score = same ? 0 : scoreFor(standard, r.hex, c.hex)
              const ok = !same && meets(standard, score, threshold)
              const sel = cell[0] === ri && cell[1] === ci
              return (
                <button
                  key={c.short}
                  id={`cg-${ri}-${ci}`}
                  type="button"
                  role="gridcell"
                  tabIndex={sel ? 0 : -1}
                  aria-selected={sel}
                  aria-label={`${r.label} text on ${c.label}: ${same ? 'same colour' : cellText(standard, score)}${ok ? ', meets threshold' : ''}`}
                  onClick={() => onSelect(ri, ci)}
                  onKeyDown={(e) => onKeyDown(e, ri, ci)}
                  className="h-8 rounded border-0 p-0 font-mono text-[10.5px] hover:outline-2 hover:-outline-offset-2 hover:outline-[#A1A1AA]"
                  style={{
                    background: ok ? `#${c.hex}` : '#F4F4F5',
                    color: ok ? `#${r.hex}` : '#52525B',
                    fontWeight: ok ? 600 : 400,
                    boxShadow: sel ? '0 0 0 2px #FFFFFF, 0 0 0 4px #18181B' : 'none'
                  }}
                >
                  {same ? '—' : cellText(standard, score)}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      <p className="mx-1 mb-0 mt-3 text-xs text-muted">Rows are text colours, columns are backgrounds. Filled cells meet the selected threshold.</p>
    </div>
  )
}
