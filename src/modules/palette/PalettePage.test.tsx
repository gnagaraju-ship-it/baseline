import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProject } from '../../store/project'
import { PalettePage } from './PalettePage'

function setup() {
  return render(
    <MemoryRouter>
      <PalettePage />
    </MemoryRouter>
  )
}

describe('Palette screen', () => {
  beforeEach(() => {
    useProject.getState().reset()
  })

  it('shows seven palettes of 16 swatches and the 112 token badge', () => {
    setup()
    for (const name of ['Primary', 'Neutral', 'Info', 'Success', 'Caution', 'Warning', 'Critical']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument()
    }
    expect(within(screen.getByRole('region', { name: 'Primary' })).getAllByRole('button', { pressed: false }).length + 1).toBeGreaterThanOrEqual(16)
    const exportBtn = screen.getByRole('button', { name: /^Export/ })
    expect(exportBtn).toHaveTextContent('112')
    expect(screen.getByRole('link', { name: /Palette/ })).toHaveTextContent('7')
  })

  it('selects a swatch and reports its contrast on white and black', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'Primary 10, #9D00D6' }))
    expect(screen.getByRole('button', { name: 'Primary 10, #9D00D6' })).toHaveAttribute('aria-pressed', 'true')
    const strip = screen.getByText('Click any swatch to inspect it').closest('div[aria-live]')!
    expect(strip).toHaveTextContent('Primary 10')
    expect(strip).toHaveTextContent('#9D00D6')
    expect(strip).toHaveTextContent(/On white/)
    expect(strip).toHaveTextContent(/On black/)
  })

  it('flags an invalid hex and keeps the default ramp', async () => {
    setup()
    const input = screen.getByRole('textbox', { name: 'Primary' })
    await userEvent.clear(input)
    await userEvent.type(input, 'zz')
    expect(screen.getByText('Enter six hex digits, like #9D00D6.')).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('region', { name: 'Primary' })).toHaveTextContent('#9D00D6')
  })

  it('regenerates the primary ramp for a new valid hex', async () => {
    setup()
    const input = screen.getByRole('textbox', { name: 'Primary' })
    await userEvent.clear(input)
    await userEvent.type(input, '#0ea5e9')
    expect(screen.getByRole('region', { name: 'Primary' })).toHaveTextContent('#0EA5E9')
    expect(screen.getByRole('button', { name: 'Primary 10, #0EA5E9' })).toBeInTheDocument()
  })

  it('removes and re-adds the neutral palette, updating the badges', async () => {
    setup()
    const neutralSection = screen.getByRole('heading', { name: 'Neutral', level: 3 }).parentElement!
    await userEvent.click(within(neutralSection).getByRole('button', { name: 'Remove' }))
    expect(screen.queryByRole('region', { name: 'Neutral' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Export/ })).toHaveTextContent('96')
    await userEvent.click(screen.getByRole('button', { name: '+ Add neutral' }))
    expect(screen.getByRole('region', { name: 'Neutral' })).toBeInTheDocument()
  })

  it('adds one secondary palette (128 tokens) and disables tertiary', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: '+ Add secondary' }))
    expect(screen.getByRole('region', { name: 'Secondary' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Export/ })).toHaveTextContent('128')
    expect(screen.getByRole('button', { name: '+ Add tertiary' })).toBeDisabled()
  })

  it('copies the CSS variables with Copy all', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: write }, configurable: true })
    setup()
    await userEvent.click(screen.getByRole('button', { name: /Copy all/ }))
    expect(write).toHaveBeenCalledTimes(1)
    const css = write.mock.calls[0][0] as string
    expect(css).toContain('--primary-10: #9D00D6;')
    expect(css.split('\n').filter((l) => l.includes('--')).length).toBe(112)
    expect(await screen.findByRole('button', { name: /Copied/ })).toBeInTheDocument()
  })

  it('lists 112 tokens on the Tokens tab', async () => {
    setup()
    await userEvent.click(screen.getByRole('tab', { name: 'tokens' }))
    expect(screen.getByText(/CSS custom properties for every ramp\. 112 tokens\./)).toBeInTheDocument()
  })
})
