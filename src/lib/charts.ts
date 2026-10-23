/**
 * Chart geometry for the UI preview. Ported from xAt, yAt, smooth, straight, ticks and the donut
 * maths in html/preview.html. All charts share one 520 x 220 frame with six monthly points.
 */
export type Point = [number, number]

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] as const

export const X0 = 60
export const X1 = 490
export const YT = 12
export const YB = 196

export function xAt(i: number): number {
  return X0 + ((X1 - X0) * i) / (MONTHS.length - 1)
}

export function yAt(v: number, max: number): number {
  return YB - ((YB - YT) * v) / max
}

export function points(values: readonly number[], max: number): Point[] {
  return values.map((v, i) => [xAt(i), yAt(v, max)])
}

const f1 = (n: number) => n.toFixed(1)

/** Straight polyline path. */
export function linePath(pts: Point[]): string {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${f1(p[0])},${f1(p[1])}`).join(' ')
}

/** Smooth path through the points (Catmull-Rom converted to cubic Béziers). */
export function smoothPath(pts: Point[]): string {
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${f1(c1x)},${f1(c1y)} ${f1(c2x)},${f1(c2y)} ${f1(p2[0])},${f1(p2[1])}`
  }
  return d
}

/** Smooth path closed down to the baseline, for area fills. */
export function areaPath(pts: Point[]): string {
  return `${smoothPath(pts)} L${X1},${YB} L${X0},${YB} Z`
}

export interface Tick {
  y: number
  /** Baseline for the label text. */
  ty: number
  label: string
}

/** Five horizontal gridlines from 0 to max. */
export function ticks(max: number): Tick[] {
  return [0, 1, 2, 3, 4].map((k) => {
    const v = (max * k) / 4
    const y = yAt(v, max)
    return { y, ty: y + 4, label: String(v) }
  })
}

export interface Bar {
  month: string
  cx: number
  x1: number
  x2: number
  y1: number
  h1: number
  y2: number
  h2: number
}

/** Grouped bars: two series per month, side by side around the month centre. */
export function barGeometry(a: readonly number[], b: readonly number[], max: number): Bar[] {
  return MONTHS.map((month, i) => {
    const cx = xAt(i)
    return { month, cx, x1: cx - 28, x2: cx + 2, y1: yAt(a[i], max), h1: YB - yAt(a[i], max), y2: yAt(b[i], max), h2: YB - yAt(b[i], max) }
  })
}

export interface DonutSlice {
  label: string
  pct: number
  /** Index into the theme series colours. */
  colour: 0 | 1 | 2 | 3
  dash: string
  offset: string
}

export const DONUT_RADIUS = 56

/** Stroke-dash arcs for a donut; each arc is shortened by 2 to leave a gap. */
export function donutSlices(data: ReadonlyArray<readonly [string, number]>, radius = DONUT_RADIUS): DonutSlice[] {
  const circumference = 2 * Math.PI * radius
  let acc = 0
  return data.map(([label, pct], i) => {
    const len = (circumference * pct) / 100
    const slice: DonutSlice = {
      label,
      pct,
      colour: i as DonutSlice['colour'],
      dash: `${(len - 2).toFixed(1)} ${(circumference - len + 2).toFixed(1)}`,
      offset: (-acc).toFixed(1)
    }
    acc += len
    return slice
  })
}

export const SAMPLE = {
  revenue: [42, 58, 47, 72, 63, 86],
  expenses: [30, 38, 34, 44, 40, 52],
  newUsers: [120, 150, 140, 195, 205, 250],
  totalUsers: [340, 395, 365, 480, 505, 620],
  web: [400, 530, 500, 600, 560, 720],
  mobile: [240, 280, 270, 380, 350, 440],
  audience: [['Primary', 42], ['Secondary', 28], ['Tertiary', 18], ['Other', 12]] as ReadonlyArray<readonly [string, number]>,
  goals: [['Revenue target', 78], ['New customers', 64], ['Retention', 91], ['NPS', 55]] as ReadonlyArray<readonly [string, number]>
}
