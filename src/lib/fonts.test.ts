import { describe, expect, it } from 'vitest'
import { FONT_CATALOG, FONT_NAMES, PAIRINGS, filterFonts, suggestFor } from './fonts'

describe('catalogue', () => {
  it('has 18 unique fonts including the original six', () => {
    expect(FONT_CATALOG).toHaveLength(18)
    expect(new Set(FONT_NAMES).size).toBe(18)
    for (const n of ['Raleway', 'Inter', 'Nunito', 'Manrope', 'DM Sans', 'Playfair Display']) expect(FONT_NAMES).toContain(n)
  })
  it('only pairs fonts that exist', () => {
    for (const [h, bodies] of Object.entries(PAIRINGS)) for (const n of [h, ...bodies]) expect(FONT_NAMES).toContain(n)
  })
})

describe('suggestFor', () => {
  it('suggests pairing bodies first for a heading font', () => {
    const s = suggestFor('body', 'Raleway')
    expect(s.map((x) => x.name)).toEqual(['Nunito', 'Inter', 'Open Sans', 'Source Sans 3'])
    expect(s[0].reason).toBe('Pairs with Raleway')
  })
  it('suggests headings that pair with the chosen body font', () => {
    const s = suggestFor('heading', 'Nunito')
    expect(s.map((x) => x.name).slice(0, 3)).toEqual(['Raleway', 'Playfair Display', 'Montserrat'])
    expect(s.every((x) => x.reason === 'Pairs with Nunito' || x.reason === 'Suited to headings')).toBe(true)
  })
  it('fills with role-suited fonts, caps at four, has no duplicates and excludes the other font', () => {
    const s = suggestFor('body', 'Merriweather')
    expect(s).toHaveLength(4)
    expect(s.every((x) => x.name !== 'Merriweather')).toBe(true)
    expect(new Set(s.map((x) => x.name)).size).toBe(4)
    expect(s.map((x) => x.reason).every((r) => r === 'Suited to body text')).toBe(true)
    const h = suggestFor('heading', 'Inter')
    expect(h.length).toBeLessThanOrEqual(4)
    expect(h.some((x) => x.name === 'Inter')).toBe(false)
  })
})

describe('filterFonts', () => {
  it('lists suggestions then every other font when there is no query', () => {
    const g = filterFonts('', 'body', 'Raleway')
    expect(g.suggested).toHaveLength(4)
    expect(g.suggested.length + g.all.length).toBe(18)
    expect(g.all.some((f) => g.suggested.some((s) => s.name === f.name))).toBe(false)
  })
  it('filters by name or category, case-insensitively, as a flat list', () => {
    const g = filterFonts('SANS', 'body', 'Raleway')
    expect(g.suggested).toEqual([])
    expect(g.all.length).toBeGreaterThan(5)
    expect(g.all.every((f) => f.name.toLowerCase().includes('sans') || f.category === 'Sans')).toBe(true)
    expect(filterFonts('play', 'heading', 'Nunito').all.map((f) => f.name)).toEqual(['Playfair Display'])
    expect(filterFonts('serif', 'heading', 'Nunito').all.map((f) => f.name)).toContain('Lora')
    expect(filterFonts('zzzz', 'heading', 'Nunito').all).toEqual([])
  })
})
