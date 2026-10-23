import type { TokenRow } from '../../lib/colour'

export function TokensList({ rows }: { rows: TokenRow[] }) {
  return (
    <div className="flex flex-col gap-2.5 p-5">
      <p className="m-0 text-xs leading-[1.55] text-muted">CSS custom properties for every ramp. {rows.length} tokens.</p>
      <div className="max-h-[1180px] overflow-auto rounded-[10px] border border-line bg-surface py-2">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-2.5 px-3 py-[5px] font-mono text-xs">
            <span className="h-3 w-3 flex-none rounded-[3px] shadow-[inset_0_0_0_1px_rgba(0,0,0,.08)]" style={{ background: `#${r.hex}` }} />
            <span className="flex-1 text-ink-2">{r.name}</span>
            <span className="text-muted">#{r.hex}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
