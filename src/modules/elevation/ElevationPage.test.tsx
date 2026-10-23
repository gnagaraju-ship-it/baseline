import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProject } from '../../store/project'
import { ElevationPage } from './ElevationPage'

function setup() {
  return render(
    <MemoryRouter initialEntries={['/elevation']}>
      <ElevationPage />
    </MemoryRouter>
  )
}

const css = () => screen.getByLabelText('Elevation CSS').textContent!
const card = (name: string) => screen.getByRole('region', { name: `elevation-${name}` })

describe('Elevation screen', () => {
  beforeEach(() => {
    useProject.getState().reset()
  })

  it('opens on Soft ambient with 5 level cards, previews and CSS', () => {
    setup()
    expect(screen.getByRole('button', { name: /Soft ambient/ })).toHaveAttribute('aria-pressed', 'true')
    for (const n of ['xs', 'sm', 'md', 'lg', 'xl']) expect(card(n)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Export/ })).toHaveTextContent('5')
    expect(css()).toContain('--elevation-md: 0px 6px 16px 0px rgba(0, 0, 0, 0.12);')
    expect(screen.getByTestId('preview-md')).toHaveStyle({ boxShadow: '0px 6px 16px 0px rgba(0, 0, 0, 0.12)' })
  })

  it('lists presets in SOFT and HARD groups with level counts', () => {
    setup()
    const soft = screen.getByRole('group', { name: 'SOFT' })
    const hard = screen.getByRole('group', { name: 'HARD' })
    expect(within(soft).getAllByRole('button')).toHaveLength(5)
    expect(within(hard).getAllByRole('button')).toHaveLength(2)
    expect(within(screen.getByRole('button', { name: /Tailwind/ })).getByText('7')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Custom/ })).toHaveTextContent('4')
  })

  it('switching preset replaces the levels and moves the highlight', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: /Material/ }))
    expect(screen.getByRole('button', { name: /Material/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Soft ambient/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getAllByRole('region').filter((r) => r.getAttribute('aria-label')?.startsWith('elevation-'))).toHaveLength(9)
    expect(screen.getByRole('button', { name: /^Export/ })).toHaveTextContent('9')
  })

  it('editing a field updates the preview and CSS and keeps the preset highlighted', async () => {
    setup()
    const blur = screen.getByLabelText('elevation-md layer 1 Blur')
    await userEvent.clear(blur)
    await userEvent.type(blur, '20')
    expect(css()).toContain('--elevation-md: 0px 6px 20px 0px')
    expect(screen.getByTestId('preview-md')).toHaveStyle({ boxShadow: '0px 6px 20px 0px rgba(0, 0, 0, 0.12)' })
    expect(screen.getByRole('button', { name: /Soft ambient/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('clamps colour opacity to 100 and accepts a negative spread', async () => {
    setup()
    const op = screen.getByLabelText('elevation-xs layer 1 Colour opacity')
    await userEvent.clear(op)
    await userEvent.type(op, '150')
    expect(css()).toContain('--elevation-xs: 0px 1px 3px 0px rgba(0, 0, 0, 1);')
    const spread = screen.getByLabelText('elevation-xs layer 1 Spread')
    await userEvent.clear(spread)
    await userEvent.type(spread, '-4')
    expect(css()).toContain('0px 1px 3px -4px')
  })

  it('adds and removes layers, never going below one', async () => {
    setup()
    expect(within(card('sm')).queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
    await userEvent.click(within(card('sm')).getByRole('button', { name: '+ Layer' }))
    expect(css()).toContain('--elevation-sm: 0px 2px 8px 0px rgba(0, 0, 0, 0.1), 0px 1px 2px 0px rgba(0, 0, 0, 0.06);')
    await userEvent.click(within(card('sm')).getByRole('button', { name: 'Remove elevation-sm layer 2' }))
    expect(css()).toContain('--elevation-sm: 0px 2px 8px 0px rgba(0, 0, 0, 0.1);')
    expect(within(card('sm')).queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
  })

  it('adds a level from the last one, and deletes a level', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: '+ Add level' }))
    expect(card('level-6')).toBeInTheDocument()
    expect(css()).toContain('--elevation-level-6: 0px 48px 128px 0px rgba(0, 0, 0, 0.16);')
    await userEvent.click(screen.getByRole('button', { name: 'Delete elevation-sm' }))
    expect(screen.queryByRole('region', { name: 'elevation-sm' })).not.toBeInTheDocument()
    expect(css()).not.toContain('--elevation-sm:')
    expect(screen.getByRole('button', { name: /^Export/ })).toHaveTextContent('5')
  })

  it('renames a level, sanitising the name, and lets the field be emptied while typing', async () => {
    setup()
    const input = screen.getByLabelText('elevation-', { selector: '#tok-2' })
    await userEvent.clear(input)
    expect(input).toHaveValue('')
    expect(css()).toContain('--elevation-md:')
    await userEvent.type(input, 'hero card')
    expect(css()).toContain('--elevation-hero-card:')
    expect(css()).not.toContain('--elevation-md:')
  })

  it('recolours every shadow from the base colour and falls back to black when invalid', async () => {
    setup()
    const hex = screen.getByLabelText('Shadow', { selector: '#shadow-hex' })
    await userEvent.clear(hex)
    await userEvent.type(hex, '#1E3A8A')
    expect(css()).toContain('rgba(30, 58, 138, 0.12)')
    await userEvent.clear(hex)
    await userEvent.type(hex, 'zz')
    expect(css()).toContain('rgba(0, 0, 0, 0.12)')
    expect(screen.getByText('Enter six hex digits.')).toBeInTheDocument()
  })

  it('copies the CSS and downloads elevation.css', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: write }, configurable: true })
    const click = vi.fn()
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() })
    HTMLAnchorElement.prototype.click = click
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'Copy CSS' }))
    expect(write.mock.calls[0][0]).toContain('--elevation-xl:')
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Export/ }))
    expect(click).toHaveBeenCalled()
  })
})
