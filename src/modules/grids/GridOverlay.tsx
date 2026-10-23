import { BREAKPOINTS, formatPx, gapLabel, type GridLayout } from '../../lib/grid'
import type { Unit } from '../../lib/typeScale'

interface Props {
  layout: GridLayout
  unit: Unit
  floating: boolean
}

const mono9 = 'font-mono text-[9px] text-muted'

export function GridOverlay({ layout: l, unit, floating }: Props) {
  const w = l.bp.width
  const pct = (px: number) => `${((px / w) * 100).toFixed(3)}%`
  return (
    <div className="overflow-x-auto rounded-[14px] border border-line bg-white px-6 py-9">
      <div className="relative mx-auto min-w-[280px]" style={{ width: `${((w / BREAKPOINTS[0].width) * 100).toFixed(2)}%` }}>
        <div className="relative h-[22px]" aria-hidden="true">
          {l.cols.map((c, i) => (
            <span key={i} className={`${mono9} absolute overflow-hidden whitespace-nowrap border-b border-[#D4D4D8] pb-[3px] text-center`} style={{ left: pct(c.left), width: pct(c.width) }}>{formatPx(c.width, unit)}</span>
          ))}
        </div>
        <div role="img" aria-label={`${l.bp.label} grid: ${l.columns} columns of ${formatPx(l.column, unit)}`} className="overflow-hidden rounded-[10px] border border-[#D4D4D8] bg-white shadow-[0_8px_24px_rgba(24,24,27,.08)]">
          <div className="flex h-[22px] items-center gap-[5px] border-b border-line-soft bg-panel px-2.5">
            <span className="h-[7px] w-[7px] rounded-full bg-[#F87171]" /><span className="h-[7px] w-[7px] rounded-full bg-[#FBBF24]" /><span className="h-[7px] w-[7px] rounded-full bg-[#34D399]" />
          </div>
          <div className="relative h-[300px]">
            {l.sidebarWidth > 0 && (
              <div
                className="absolute z-[2] flex flex-col items-center justify-center gap-0.5 border-r border-dashed border-[#A1A1AA] bg-[#EFEFF1]"
                style={{ left: floating ? 8 : 0, top: floating ? 8 : 0, bottom: floating ? 8 : 0, width: pct(l.sidebarWidth), borderRadius: floating ? 8 : 0, boxShadow: floating ? '0 6px 16px rgba(0,0,0,.12)' : 'none' }}
              >
                <span className="font-mono text-[10px] text-muted">Sidebar</span>
                <span className="font-mono text-[10px] text-muted">{formatPx(l.sidebarWidth, unit)}</span>
              </div>
            )}
            {l.cols.map((c, i) => (
              <div key={i} data-testid="grid-column" className="absolute bottom-0 top-0 bg-[#FFE4DA]" style={{ left: pct(c.left), width: pct(c.width) }} />
            ))}
          </div>
        </div>
        <div className="relative h-6" aria-hidden="true">
          {l.gaps.map((g, i) => (
            <span key={i} className={`${mono9} absolute top-1.5 -translate-x-1/2 whitespace-nowrap`} style={{ left: pct(g.at) }}>{gapLabel(g.value, g.margin, l.columns, unit)}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
