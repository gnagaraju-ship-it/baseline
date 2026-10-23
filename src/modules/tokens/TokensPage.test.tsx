import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProject } from '../../store/project'
import { TokensPage } from './TokensPage'

function setup() {
  return render(
    <MemoryRouter initialEntries={['/tokens']}>
      <TokensPage />
    </MemoryRouter>
  )
}

const cell = (name: string, mode: 'light' | 'dark', label: string) =>
  screen.getByRole('button', { name: new RegExp(`^${name}, ${mode} mode: ${label}\\. Change`) })

describe('Tokens screen', () => {
  beforeEach(() => {
    useProject.getState().reset()
  })

  it('shows 58 tokens in three groups and the count badges', () => {
    setup()
    expect(within(screen.getByRole('table', { name: 'Backgrounds' })).getAllByRole('row')).toHaveLength(1 + 39)
    expect(within(screen.getByRole('table', { name: 'Text' })).getAllByRole('row')).toHaveLength(1 + 12)
    expect(within(screen.getByRole('table', { name: 'Borders' })).getAllByRole('row')).toHaveLength(1 + 7)
    expect(screen.getByRole('button', { name: /^Export/ })).toHaveTextContent('58')
    expect(screen.getByRole('link', { name: /Tokens/ })).toHaveTextContent('58')
  })

  it('shows the default mapping with light and dark refs and Lc badges', () => {
    setup()
    const light = cell('bg-fill', 'light', 'primary-10')
    // ref text followed by the Lc badge number
    expect(light.textContent).toMatch(/^primary-10\d+$/)
    expect(cell('bg-fill', 'dark', 'primary-9')).toBeInTheDocument()
    // alpha colours carry no Lc badge
    expect(cell('bg-surface-disabled', 'light', 'black-alpha-5').textContent).toBe('black-alpha-5')
  })

  it('opens the picker under the row with 9 palette chips and 16 swatches, and closes on a second click', async () => {
    setup()
    const btn = cell('bg-fill', 'light', 'primary-10')
    await userEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    const dialog = screen.getByRole('dialog', { name: 'bg-fill, light mode' })
    expect(within(within(dialog).getByRole('group', { name: 'Palette' })).getAllByRole('button')).toHaveLength(9)
    expect(within(dialog).getAllByRole('button', { name: /^primary-\d+$/ })).toHaveLength(16)
    await userEvent.click(btn)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })

  it('remaps a token from the picker and restores the default when the default step is picked again', async () => {
    setup()
    await userEvent.click(cell('bg-fill', 'light', 'primary-10'))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'info' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'info-10' }))
    expect(cell('bg-fill', 'light', 'info-10')).toBeInTheDocument()
    expect(cell('bg-fill', 'dark', 'primary-9')).toBeInTheDocument()
    expect(Object.keys(useProject.getState().tokenOverrides)).toEqual(['bg-fill|light'])
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'primary' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'primary-10' }))
    expect(useProject.getState().tokenOverrides).toEqual({})
    expect(cell('bg-fill', 'light', 'primary-10')).toBeInTheDocument()
  })

  it('shows alpha steps without Lc in the picker', async () => {
    setup()
    await userEvent.click(cell('bg-fill', 'light', 'primary-10'))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'black α' }))
    const swatch = within(dialog).getByRole('button', { name: 'black-alpha-3' })
    expect(swatch).toHaveTextContent('–')
  })

  it('closes on Escape and returns focus to the cell', async () => {
    setup()
    const btn = cell('text', 'dark', 'neutral-2')
    await userEvent.click(btn)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(btn).toHaveFocus()
  })

  it('follows the brand colour: tokens repaint when Primary changes', () => {
    setup()
    const before = cell('bg-fill', 'light', 'primary-10').querySelector('span')!
    expect(before).toHaveStyle({ background: '#9D00D6' })
    useProject.getState().setText('primary', '#0EA5E9')
    const after = screen.getByRole('button', { name: /^bg-fill, light mode: primary-10\. Change/ }).querySelector('span')!
    return vi.waitFor(() => expect(after).toHaveStyle({ background: '#0EA5E9' }))
  })

  it('warns about removed palettes, marks tokens unavailable and lowers the count', async () => {
    useProject.getState().setNeutralEnabled(false)
    setup()
    expect(screen.getByRole('status')).toHaveTextContent(/removed: Neutral/)
    expect(screen.getAllByText(/unavailable/).length).toBeGreaterThan(0)
    const exportBtn = screen.getByRole('button', { name: /^Export/ })
    expect(Number(exportBtn.textContent!.replace(/\D/g, ''))).toBeLessThan(58)
  })

  it('copies the semantic token CSS with Copy all', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: write }, configurable: true })
    setup()
    await userEvent.click(screen.getByRole('button', { name: /Copy all/ }))
    const css = write.mock.calls[0][0] as string
    expect(css).toContain(':root {')
    expect(css).toContain('--bg-fill: var(--primary-10);')
    expect(css).toContain('[data-theme="dark"]')
    expect(await screen.findByRole('button', { name: /Copied/ })).toBeInTheDocument()
  })
})
