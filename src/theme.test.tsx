import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { wcagRatio } from './lib/contrast'
import { useProject } from './store/project'

const css = readFileSync(join(__dirname, 'index.css'), 'utf8')

function vars(block: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of block.matchAll(/--color-([a-z0-9-]+):\s*#([0-9a-f]{6})/gi)) out[m[1]] = m[2].toUpperCase()
  return out
}

const light = vars(css.slice(css.indexOf('@theme static'), css.indexOf(':root[data-theme="dark"]')))
const dark = { ...light, ...vars(css.slice(css.indexOf(':root[data-theme="dark"]'), css.indexOf('@layer base'))) }

/** [text token, background token] pairs that the UI actually draws. */
const PAIRS: Array<[string, string]> = [
  ['ink', 'ground'], ['ink', 'surface'], ['ink', 'panel'], ['ink', 'soft'], ['ink', 'accent-wash'],
  ['ink-2', 'surface'], ['ink-3', 'surface'], ['ink-3', 'ground'],
  ['muted', 'ground'], ['muted', 'surface'], ['muted', 'panel'], ['muted', 'soft'],
  ['subtle', 'ground'], ['subtle', 'surface'],
  ['accent-text', 'ground'], ['accent-text', 'surface'], ['accent-text', 'accent-tint'],
  ['danger', 'ground'], ['danger', 'surface'],
  ['on-ink', 'ink'],
  ['warn-text', 'warn-bg'], ['warn-text', 'warn-chip'],
  ['ok', 'surface'], ['mid', 'surface'], ['bad', 'surface']
]

describe('tool theme colours', () => {
  for (const [name, palette] of [['light', light], ['dark', dark]] as const) {
    it(`every text pair reaches 4.5:1 in the ${name} theme`, () => {
      const low = PAIRS.map(([fg, bg]) => ({ fg, bg, ratio: wcagRatio(palette[fg], palette[bg]) })).filter((p) => p.ratio < 4.5)
      expect(low).toEqual([])
    })
  }

  it('white on the orange export button reaches 4.5:1 in both themes', () => {
    expect(wcagRatio('FFFFFF', light.btn)).toBeGreaterThanOrEqual(4.5)
    expect(wcagRatio('FFFFFF', dark.btn)).toBeGreaterThanOrEqual(4.5)
  })

  it('defines every token in both themes, and the dark theme actually differs', () => {
    for (const k of Object.keys(light)) expect(dark[k]).toMatch(/^[0-9A-F]{6}$/)
    for (const k of ['ground', 'surface', 'ink', 'line', 'muted', 'on-ink']) expect(dark[k]).not.toBe(light[k])
    for (const k of ['night', 'code', 'accent', 'btn']) expect(dark[k]).toBe(light[k])
  })

  it('no component uses the light-only colours that the tokens replaced', () => {
    const banned = [/\bbg-white\b/, /text-\[#3F3F46\]/, /border-\[#D4D4D8\]/, /bg-\[#FFF7F3\]/, /bg-\[#FFFBEB\]/, /bg-\[#FEF3C7\]/, /bg-ink[^'"`]*text-white/]
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((f: string) => {
        const p = join(dir, f)
        return statSync(p).isDirectory() ? walk(p) : /\.tsx$/.test(p) && !/\.test\./.test(p) ? [p] : []
      })
    const offenders = ['components', 'modules']
      .flatMap((d) => walk(join(__dirname, d)))
      .filter((f) => banned.some((re) => re.test(readFileSync(f, 'utf8'))))
    expect(offenders).toEqual([])
  })
})

describe('theme switch', () => {
  beforeEach(() => {
    useProject.getState().setAppTheme('light')
    document.documentElement.removeAttribute('data-theme')
  })

  function at(path = '/') {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    )
  }

  it('applies the saved theme to the page and toggles from the rail', async () => {
    at()
    expect(document.documentElement.dataset.theme).toBe('light')
    const toggle = screen.getByRole('button', { name: 'Toggle dark mode' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(toggle)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(useProject.getState().appTheme).toBe('dark')
    await userEvent.click(toggle)
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('saves the choice, keeps it when the project is reset, and is independent of the UI preview mode', async () => {
    at('/preview')
    await userEvent.click(screen.getByRole('button', { name: 'Toggle dark mode' }))
    expect(JSON.parse(localStorage.getItem('omni-project')!).state.appTheme).toBe('dark')
    useProject.getState().reset()
    expect(useProject.getState().appTheme).toBe('dark')
    expect(useProject.getState().previewMode).toBe('light')
    await userEvent.click(screen.getByRole('button', { name: 'Dark' }))
    expect(useProject.getState().appTheme).toBe('dark')
    expect(useProject.getState().previewMode).toBe('dark')
  })
})
