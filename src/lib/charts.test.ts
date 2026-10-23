import { describe, expect, it } from 'vitest'
import { X0, X1, YB, YT, areaPath, barGeometry, donutSlices, linePath, points, smoothPath, ticks, xAt, yAt, SAMPLE } from './charts'

describe('scales', () => {
  it('maps month 0 and 5 to the frame edges and values to the vertical range', () => {
    expect(xAt(0)).toBe(X0)
    expect(xAt(5)).toBe(X1)
    expect(yAt(0, 100)).toBe(YB)
    expect(yAt(100, 100)).toBe(YT)
  })
  it('builds one gridline per quarter with labels 0..max', () => {
    const t = ticks(800)
    expect(t.map((x) => x.label)).toEqual(['0', '200', '400', '600', '800'])
    expect(t[0].y).toBe(YB)
    expect(t[4].y).toBe(YT)
    expect(t[0].ty).toBe(YB + 4)
  })
})

describe('paths', () => {
  const pts = points(SAMPLE.web, 800)
  it('draws a straight path through every point', () => {
    const d = linePath(pts)
    expect(d.startsWith('M60.0,')).toBe(true)
    expect(d.match(/L/g)).toHaveLength(5)
  })
  it('draws a smooth path with one curve per segment ending at the last point', () => {
    const d = smoothPath(pts)
    expect(d.match(/C/g)).toHaveLength(5)
    expect(d.endsWith(`${pts[5][0].toFixed(1)},${pts[5][1].toFixed(1)}`)).toBe(true)
  })
  it('closes an area down to the baseline', () => {
    expect(areaPath(pts).endsWith(`L${X1},${YB} L${X0},${YB} Z`)).toBe(true)
  })
})

describe('bars', () => {
  it('gives six month groups whose heights reach the baseline', () => {
    const bars = barGeometry(SAMPLE.revenue, SAMPLE.expenses, 100)
    expect(bars.map((b) => b.month)).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'])
    for (const b of bars) {
      expect(b.y1 + b.h1).toBeCloseTo(YB)
      expect(b.y2 + b.h2).toBeCloseTo(YB)
    }
    expect(bars[5].h1).toBeGreaterThan(bars[5].h2)
  })
})

describe('donut', () => {
  it('splits the circumference by share, with a 2px gap per arc', () => {
    const slices = donutSlices(SAMPLE.audience)
    const c = 2 * Math.PI * 56
    expect(slices.map((s) => s.pct).reduce((a, b) => a + b, 0)).toBe(100)
    for (const s of slices) {
      const [dash, gap] = s.dash.split(' ').map(Number)
      expect(dash + gap).toBeCloseTo(c, 0)
    }
    expect(slices[0].offset).toBe('0.0')
    expect(Number(slices[1].offset)).toBeCloseTo(-c * 0.42, 0)
    expect(slices.map((s) => s.colour)).toEqual([0, 1, 2, 3])
  })
})
