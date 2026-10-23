import { describe, expect, it } from 'vitest'
import {
  clampColumns, clampGutter, computeGrid, defaultGridSettings, formatPx, gapLabel, gridDescription, gridStats, gridTitle, marginFor, sidebarChip, toGridCss, type GridSettings
} from './grid'

const base = (patch: Partial<GridSettings> = {}): GridSettings => ({ ...defaultGridSettings(), ...patch })

describe('computeGrid', () => {
  it('XXL default: sidebar reserved, margins 16, 12 columns of 67.33px', () => {
    const l = computeGrid(base(), 'xxl')
    expect(l).toMatchObject({ reserved: 272, margin: 16, available: 1096, content: 1096, columns: 12, gutter: 24 })
    expect(l.column).toBeCloseTo((1096 - 11 * 24) / 12, 6)
    expect(l.column).toBeCloseTo(69.33, 1)
    expect(l.cols).toHaveLength(12)
    expect(l.cols[0].left).toBe(288)
    expect(l.cols[11].left + l.cols[11].width).toBeCloseTo(1400 - 16, 6)
  })
  it('MD default: collapsed rail of 72, 8 columns, gutter 16', () => {
    const l = computeGrid(base(), 'md')
    expect(l).toMatchObject({ reserved: 72, available: 768 - 72 - 32, columns: 8, gutter: 16 })
    expect(l.column).toBeCloseTo((664 - 7 * 16) / 8, 6)
  })
  it('XS default: no sidebar, 4 columns', () => {
    const l = computeGrid(base(), 'xs')
    expect(l).toMatchObject({ reserved: 0, sidebarWidth: 0, available: 358, columns: 4 })
    expect(l.column).toBeCloseTo((358 - 3 * 16) / 4, 6)
  })
  it('sidebar off reserves nothing; floating keeps the sidebar but reserves nothing', () => {
    const off = computeGrid(base({ sidebar: false }), 'xxl')
    expect(off).toMatchObject({ reserved: 0, sidebarWidth: 0, available: 1368 })
    const floating = computeGrid(base({ floating: true }), 'xxl')
    expect(floating).toMatchObject({ reserved: 0, sidebarWidth: 272, available: 1368 })
  })
  it('max content width caps the content and centres it', () => {
    const l = computeGrid(base({ maxWidth: true, sidebar: false }), 'xxl')
    expect(l.content).toBe(1200)
    expect(l.cols[0].left).toBeCloseTo(16 + (1368 - 1200) / 2, 6)
    expect(l.bp.width - l.reserved - l.content).toBe(200)
    expect(computeGrid(base({ maxWidth: true }), 'md').content).toBe(664)
  })
  it('clamps columns and gutter', () => {
    expect(computeGrid(base({ columns: { xxl: 99, md: 8, xs: 4 } }), 'xxl').columns).toBe(24)
    expect(computeGrid(base({ columns: { xxl: 0, md: 8, xs: 4 } }), 'xxl').columns).toBe(1)
    expect(clampColumns(NaN)).toBe(1)
    expect(clampGutter(-4)).toBe(0)
    expect(clampGutter(500)).toBe(96)
  })
  it('lists the two margin gaps and one gutter between each pair of columns, none at gutter 0', () => {
    const l = computeGrid(base(), 'xxl')
    expect(l.gaps).toHaveLength(2 + 11)
    expect(l.gaps[0]).toMatchObject({ margin: true, value: 16, at: 280 })
    expect(computeGrid(base({ gutter: { xxl: 0, md: 16, xs: 16 } }), 'xxl').gaps).toHaveLength(2)
  })
  it('uses the preset margins and falls back to Standard for Custom', () => {
    expect(marginFor('dense', 'xs')).toBe(12)
    expect(marginFor('airy', 'xxl')).toBe(32)
    expect(marginFor('custom', 'md')).toBe(16)
    expect(computeGrid(base({ preset: 'airy' }), 'xxl').margin).toBe(32)
  })
})

describe('formatting', () => {
  it('formats px, rem and pt and trims zeros', () => {
    expect(formatPx(272, 'px')).toBe('272px')
    expect(formatPx(272, 'rem')).toBe('17rem')
    expect(formatPx(69.3333, 'rem')).toBe('4.33rem')
    expect(formatPx(72, 'pt')).toBe('54pt')
    expect(formatPx(69.3333, 'px')).toBe('69.3px')
  })
  it('drops the unit from gutter labels above 8 columns, never from margins', () => {
    expect(gapLabel(24, false, 12, 'px')).toBe('24')
    expect(gapLabel(24, false, 8, 'px')).toBe('24px')
    expect(gapLabel(16, true, 12, 'px')).toBe('16px')
  })
})

describe('stats and text', () => {
  it('reports the seven stats for XXL', () => {
    const s = base()
    const stats = gridStats(computeGrid(s, 'xxl'), 'px')
    expect(stats.map((x) => x.k)).toEqual(['VIEWPORT', 'SIDEBAR', 'MARGINS', 'CONTENT', 'COLUMNS', 'GUTTER', 'COLUMN'])
    expect(stats.map((x) => x.v).slice(0, 6)).toEqual(['1400px', '−272px', '−32px', '1096px', '12', '24px'])
    expect(stats[6]).toMatchObject({ v: '69.3px', accent: true })
  })
  it('shows 0 for sidebar when none is reserved and counts the centring gap in margins', () => {
    const stats = gridStats(computeGrid(base({ maxWidth: true, sidebar: false }), 'xxl'), 'px')
    expect(stats[1].v).toBe('0px')
    expect(stats[2].v).toBe('−200px')
  })
  it('builds title, description and sidebar chip', () => {
    const s = base()
    const l = computeGrid(s, 'xxl')
    expect(gridTitle(l, true)).toBe('XXL · Expanded')
    expect(gridTitle(l, false)).toBe('XXL · No sidebar')
    expect(gridDescription(l, s, 'px')).toContain('each one is 69.3px')
    expect(gridDescription(computeGrid({ ...s, floating: true }, 'xxl'), { ...s, floating: true }, 'px')).toContain('floats over')
    expect(gridDescription(computeGrid({ ...s, sidebar: false }, 'xxl'), { ...s, sidebar: false }, 'px')).toMatch(/^No sidebar reserved/)
    expect(sidebarChip(l, s, 'px')).toEqual({ state: 'Expanded', width: '272px' })
    expect(sidebarChip(computeGrid(s, 'xs'), s, 'px')).toEqual({ state: 'Hidden', width: '0px' })
    expect(sidebarChip(l, { ...s, sidebar: false }, 'px').state).toBe('Off')
  })
})

describe('css export', () => {
  it('writes per-breakpoint variables for enabled breakpoints only', () => {
    const css = toGridCss(base({ on: { xxl: true, md: false, xs: true } }))
    expect(css).toContain('--grid-xxl-width: 1400px;')
    expect(css).toContain('--grid-xxl-columns: 12;')
    expect(css).toContain('--grid-xxl-gutter: 24px;')
    expect(css).toContain('--grid-xxl-sidebar: 272px;')
    expect(css).toContain('--grid-xxl-column: 69.33px;')
    expect(css).not.toContain('--grid-md-')
    expect(css).toContain('--grid-xs-sidebar: 0px;')
  })
})
