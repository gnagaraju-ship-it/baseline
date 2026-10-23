import { describe, expect, it } from 'vitest'
import { buildPalettes, defaultSettings } from './colour'
import { cellText, checklist, detailText, gridColours, meets, scoreFor, thresholdInfo } from './contrastGrid'

const primary = buildPalettes(defaultSettings())[0]

describe('gridColours', () => {
  it('is White, the 16 steps, then Black', () => {
    const c = gridColours(primary)
    expect(c).toHaveLength(18)
    expect(c[0]).toMatchObject({ label: 'White', short: 'W', hex: 'FFFFFF' })
    expect(c[1]).toMatchObject({ label: '1', short: '1', hex: primary.steps[0] })
    expect(c[10].hex).toBe('9D00D6')
    expect(c[17]).toMatchObject({ label: 'Black', short: 'B', hex: '000000' })
  })
})

describe('scoreFor', () => {
  it('gives 21:1 for black on white and about Lc 106 / -108 for the APCA pair', () => {
    expect(scoreFor('wcag', '000000', 'FFFFFF')).toBeCloseTo(21, 5)
    expect(scoreFor('apca', '000000', 'FFFFFF')).toBeGreaterThan(105)
    expect(scoreFor('apca', 'FFFFFF', '000000')).toBeLessThan(-105)
  })
  it('scores the same colour as no contrast', () => {
    expect(scoreFor('apca', '9D00D6', '9D00D6')).toBe(0)
    expect(scoreFor('wcag', '9D00D6', '9D00D6')).toBeCloseTo(1, 5)
  })
})

describe('formatting', () => {
  it('prints whole Lc and one-decimal ratio in cells', () => {
    expect(cellText('apca', 62.4)).toBe('62')
    expect(cellText('apca', -62.6)).toBe('-63')
    expect(cellText('wcag', 4.5149)).toBe('4.5')
  })
  it('prints Lc N and N.NN:1 in the detail card', () => {
    expect(detailText('apca', 61.6)).toBe('Lc 62')
    expect(detailText('wcag', 4.5149)).toBe('4.51:1')
  })
})

describe('meets', () => {
  it('compares absolute Lc and plain ratio against the minimum', () => {
    expect(meets('apca', -75, 75)).toBe(true)
    expect(meets('apca', 59.9, 60)).toBe(false)
    expect(meets('wcag', 4.5, 4.5)).toBe(true)
    expect(meets('wcag', 4.49, 4.5)).toBe(false)
  })
  it('never highlights for All (minimum 0)', () => {
    expect(meets('apca', 100, 0)).toBe(false)
    expect(meets('wcag', 21, 0)).toBe(false)
  })
})

describe('checklist', () => {
  it('flags each APCA use case', () => {
    expect(checklist('apca', 70).map((c) => c.ok)).toEqual([true, true, false, false])
    expect(checklist('apca', -95).map((c) => c.ok)).toEqual([true, true, true, true])
  })
  it('flags each WCAG 2 use case', () => {
    expect(checklist('wcag', 4.5).map((c) => c.ok)).toEqual([true, true, false])
    expect(checklist('wcag', 2).map((c) => c.ok)).toEqual([false, false, false])
    expect(checklist('wcag', 4.5).map((c) => c.need)).toEqual(['3:1', '4.5:1', '7:1'])
  })
})

describe('thresholdInfo', () => {
  it('returns the label and description for a minimum', () => {
    expect(thresholdInfo('apca', 60)).toEqual({ label: '60+', description: 'Small text, UI elements' })
    expect(thresholdInfo('wcag', 0)).toEqual({ label: 'All', description: 'Show every value' })
  })
})
