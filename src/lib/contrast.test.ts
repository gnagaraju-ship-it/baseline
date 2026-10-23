import { describe, expect, it } from 'vitest'
import { CHECKS, THRESHOLDS, apcaLc, grade, luminance, wcagRatio } from './contrast'

describe('WCAG 2', () => {
  it('white on black is 21:1', () => {
    expect(wcagRatio('FFFFFF', '000000')).toBeCloseTo(21, 5)
    expect(wcagRatio('000000', 'FFFFFF')).toBeCloseTo(21, 5)
  })
  it('same colour is 1:1', () => {
    expect(wcagRatio('9D00D6', '9D00D6')).toBeCloseTo(1, 10)
  })
  it('matches a known mid-grey pair', () => {
    // #767676 on white is the classic AA boundary: 4.54:1
    expect(wcagRatio('767676', 'FFFFFF')).toBeCloseTo(4.54, 1)
  })
  it('luminance of white is 1 and of black is 0', () => {
    expect(luminance('FFFFFF')).toBeCloseTo(1, 6)
    expect(luminance('000000')).toBe(0)
  })
  it('grades by ratio', () => {
    expect(grade(21)).toBe('AAA')
    expect(grade(7)).toBe('AAA')
    expect(grade(4.5)).toBe('AA')
    expect(grade(3)).toBe('AA Large')
    expect(grade(2.99)).toBe('Fail')
  })
})

describe('APCA', () => {
  it('black on white is about +106 and white on black about -108', () => {
    expect(apcaLc('000000', 'FFFFFF')).toBeGreaterThan(105)
    expect(apcaLc('000000', 'FFFFFF')).toBeLessThan(107)
    expect(apcaLc('FFFFFF', '000000')).toBeLessThan(-107)
    expect(apcaLc('FFFFFF', '000000')).toBeGreaterThan(-109)
  })
  it('is zero for identical colours', () => {
    expect(apcaLc('9D00D6', '9D00D6')).toBe(0)
  })
  it('is positive for dark-on-light and negative for light-on-dark', () => {
    expect(apcaLc('1F2937', 'F9FAFB')).toBeGreaterThan(0)
    expect(apcaLc('F9FAFB', '1F2937')).toBeLessThan(0)
  })
  it('white text on the default primary is a strong negative value', () => {
    expect(Math.abs(apcaLc('FFFFFF', '9D00D6'))).toBeGreaterThan(75)
  })
})

describe('threshold tables', () => {
  it('include an "All" option that shows every value', () => {
    expect(THRESHOLDS.apca.at(-1)).toEqual([0, 'All', 'Show every value'])
    expect(THRESHOLDS.wcag.at(-1)).toEqual([0, 'All', 'Show every value'])
  })
  it('have the documented check lists', () => {
    expect(CHECKS.apca.map((c) => c[0])).toEqual([45, 60, 75, 90])
    expect(CHECKS.wcag.map((c) => c[0])).toEqual([3, 4.5, 7])
  })
})
