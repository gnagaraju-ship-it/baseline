import type { ReactNode } from 'react'
import type { ChartTheme } from '../../lib/chartTheme'
import { MONTHS, ticks, xAt } from '../../lib/charts'

export function ChartCard({ title, theme, gap = 10, children }: { title: string; theme: ChartTheme; gap?: number; children: ReactNode }) {
  return (
    <figure className="m-0 flex flex-col rounded-[14px] border px-[18px] py-4" style={{ background: theme.card, borderColor: theme.border, gap }}>
      <figcaption className="text-[15px] font-bold" style={{ fontFamily: 'var(--preview-heading)', color: theme.text }}>{title}</figcaption>
      {children}
    </figure>
  )
}

/** Dashed gridlines with y labels. */
export function Grid({ max, theme }: { max: number; theme: ChartTheme }) {
  return (
    <>
      {ticks(max).map((g) => (
        <g key={g.label}>
          <line x1="36" x2="510" y1={g.y} y2={g.y} stroke={theme.grid} strokeDasharray="3 4" />
          <text x="28" y={g.ty} textAnchor="end" fontSize="11" fill={theme.axis}>{g.label}</text>
        </g>
      ))}
    </>
  )
}

export function MonthLabels({ theme }: { theme: ChartTheme }) {
  return (
    <>
      {MONTHS.map((m, i) => <text key={m} x={xAt(i)} y="214" textAnchor="middle" fontSize="11" fill={theme.axis}>{m}</text>)}
    </>
  )
}

export function Legend({ theme, items }: { theme: ChartTheme; items: Array<{ label: string; swatch: ReactNode }> }) {
  return (
    <div className="flex gap-4 text-xs" style={{ color: theme.muted }}>
      {items.map((i) => <span key={i.label} className="flex items-center gap-1.5">{i.swatch}{i.label}</span>)}
    </div>
  )
}

export const box = (background: string) => <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background }} />
