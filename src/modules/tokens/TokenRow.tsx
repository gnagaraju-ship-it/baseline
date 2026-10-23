import type { Palette } from '../../lib/colour'
import type { Mode, ResolvedCell, ResolvedToken } from '../../lib/tokens'
import { useProject } from '../../store/project'
import { TokenPicker, cellId } from './TokenPicker'

function Cell({ token, mode, open }: { token: ResolvedToken; mode: Mode; open: boolean }) {
  const cell: ResolvedCell = token[mode]
  const openPicker = useProject((s) => s.openPicker)
  const closePicker = useProject((s) => s.closePicker)
  const fill = token.def.kind === 'f'

  return (
    <button
      id={cellId(token.def.name, mode)}
      type="button"
      aria-expanded={open}
      aria-label={`${token.def.name}, ${mode} mode: ${cell.available ? cell.label : `${cell.label} (unavailable)`}. Change`}
      onClick={() => (open ? closePicker() : openPicker(token.def.name, mode, cell.palette))}
      className={`flex h-11 items-center gap-2.5 border-0 pl-4 pr-3 text-left hover:bg-panel ${open ? 'bg-soft' : 'bg-transparent'}`}
    >
      <span className="h-[18px] w-[18px] flex-none rounded-[5px] shadow-[inset_0_0_0_1px_rgba(0,0,0,.1)]" style={{ background: cell.paint }} />
      <span className={`flex-1 font-mono text-xs ${cell.available ? 'text-ink-3' : 'italic text-muted'}`}>{cell.label}{cell.available ? '' : ' · unavailable'}</span>
      {cell.lc !== null && (
        <span className={`min-w-[22px] rounded-[5px] border px-1.5 py-px text-center font-mono text-[11px] ${fill ? 'border-edge font-bold text-ink' : 'border-line font-normal text-muted'}`}>{cell.lc}</span>
      )}
    </button>
  )
}

export function TokenRow({ token, palettes }: { token: ResolvedToken; palettes: Palette[] }) {
  const openToken = useProject((s) => s.openToken)
  const rowOpen = openToken?.name === token.def.name
  return (
    <div className="border-b border-line-faint" role="row">
      <div className="grid min-h-11 grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] items-center">
        <div role="rowheader" className="px-4 font-mono text-[13px] text-ink">{token.def.name}</div>
        <Cell token={token} mode="light" open={rowOpen && openToken?.mode === 'light'} />
        <Cell token={token} mode="dark" open={rowOpen && openToken?.mode === 'dark'} />
      </div>
      {rowOpen && openToken && <TokenPicker token={token} mode={openToken.mode} palettes={palettes} />}
    </div>
  )
}
