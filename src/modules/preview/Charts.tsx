import { SAMPLE, areaPath, barGeometry, donutSlices, linePath, points, smoothPath } from '../../lib/charts'
import type { ChartTheme } from '../../lib/chartTheme'
import { ChartCard, Grid, Legend, MonthLabels, box } from './ChartCard'

const SVG = 'h-auto w-full'

export function BarChartCard({ theme }: { theme: ChartTheme }) {
  return (
    <ChartCard title="Revenue vs Expenses" theme={theme}>
      <svg viewBox="0 0 520 220" role="img" aria-label="Grouped bar chart of revenue and expenses, January to June" className={SVG}>
        <Grid max={100} theme={theme} />
        {barGeometry(SAMPLE.revenue, SAMPLE.expenses, 100).map((b) => (
          <g key={b.month}>
            <rect x={b.x1} y={b.y1} width="26" height={b.h1} rx="3" fill={theme.c1} />
            <rect x={b.x2} y={b.y2} width="26" height={b.h2} rx="3" fill={theme.c2} />
            <text x={b.cx} y="214" textAnchor="middle" fontSize="11" fill={theme.axis}>{b.month}</text>
          </g>
        ))}
      </svg>
      <Legend theme={theme} items={[{ label: 'Revenue', swatch: box(theme.c1) }, { label: 'Expenses', swatch: box(theme.c2) }]} />
    </ChartCard>
  )
}

export function LineChartCard({ theme }: { theme: ChartTheme }) {
  const n = points(SAMPLE.newUsers, 800)
  const t = points(SAMPLE.totalUsers, 800)
  return (
    <ChartCard title="User Growth" theme={theme}>
      <svg viewBox="0 0 520 220" role="img" aria-label="Line chart of new and total users, January to June" className={SVG}>
        <Grid max={800} theme={theme} />
        <path d={linePath(t)} fill="none" stroke={theme.c2} strokeWidth="2" strokeDasharray="5 5" />
        <path d={linePath(n)} fill="none" stroke={theme.c1} strokeWidth="2.5" />
        {n.map((p, i) => <circle key={`n${i}`} cx={p[0]} cy={p[1]} r="3.5" fill={theme.c1} />)}
        {t.map((p, i) => <circle key={`t${i}`} cx={p[0]} cy={p[1]} r="3.5" fill={theme.c2} />)}
        <MonthLabels theme={theme} />
      </svg>
      <Legend
        theme={theme}
        items={[
          { label: 'New users', swatch: <span className="h-[3px] w-3.5 rounded-sm" style={{ background: theme.c1 }} /> },
          { label: 'Total users', swatch: <span className="h-0 w-3.5" style={{ borderTop: `2px dashed ${theme.c2}` }} /> }
        ]}
      />
    </ChartCard>
  )
}

export function AreaChartCard({ theme }: { theme: ChartTheme }) {
  const w = points(SAMPLE.web, 800)
  const m = points(SAMPLE.mobile, 800)
  return (
    <ChartCard title="Traffic by Platform" theme={theme}>
      <svg viewBox="0 0 520 220" role="img" aria-label="Area chart of web and mobile traffic, January to June" className={SVG}>
        <Grid max={800} theme={theme} />
        <path d={areaPath(w)} fill={theme.c1} fillOpacity="0.12" />
        <path d={areaPath(m)} fill={theme.c3} fillOpacity="0.1" />
        <path d={smoothPath(w)} fill="none" stroke={theme.c1} strokeWidth="2.5" />
        <path d={smoothPath(m)} fill="none" stroke={theme.c3} strokeWidth="2.5" />
        <MonthLabels theme={theme} />
      </svg>
      <Legend theme={theme} items={[{ label: 'Web', swatch: box(theme.c1) }, { label: 'Mobile', swatch: box(theme.c3) }]} />
    </ChartCard>
  )
}

export function DonutCard({ theme }: { theme: ChartTheme }) {
  const colours = [theme.c1, theme.c2, theme.c3, theme.c4]
  const slices = donutSlices(SAMPLE.audience)
  const label = `Donut chart: ${slices.map((s) => `${s.label} ${s.pct}%`).join(', ')}`
  return (
    <ChartCard title="Audience Breakdown" theme={theme}>
      <div className="flex flex-1 flex-wrap items-center justify-center gap-7 py-2">
        <svg viewBox="0 0 160 160" width="180" height="180" role="img" aria-label={label}>
          <g transform="rotate(-90 80 80)">
            {slices.map((s) => (
              <circle key={s.label} cx="80" cy="80" r="56" fill="none" stroke={colours[s.colour]} strokeWidth="26" strokeDasharray={s.dash} strokeDashoffset={s.offset} />
            ))}
          </g>
        </svg>
        <div className="flex flex-col gap-2.5 text-[13px]" style={{ color: theme.text }}>
          {slices.map((s) => (
            <div key={s.label} className="grid grid-cols-[12px_90px_40px] items-center gap-2">
              {box(colours[s.colour])}
              <span>{s.label}</span>
              <span className="text-right font-bold">{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  )
}

export function GoalsCard({ theme }: { theme: ChartTheme }) {
  const colours = [theme.c1, theme.c3, theme.success, theme.warning]
  return (
    <ChartCard title="Quarterly Goals" theme={theme} gap={14}>
      {SAMPLE.goals.map(([label, v], i) => (
        <div key={label} className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[13px]" style={{ color: theme.text }}>
            <span>{label}</span>
            <span className="font-bold">{v}%</span>
          </div>
          <div role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full" style={{ background: theme.track }}>
            <div className="h-full rounded-full" style={{ width: `${v}%`, background: colours[i] }} />
          </div>
        </div>
      ))}
    </ChartCard>
  )
}
