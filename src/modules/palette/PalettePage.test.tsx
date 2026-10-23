import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildPalettes } from '../../lib/colour'
import { pickerChips } from '../../lib/tokens'
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

  it('adds a secondary palette (128 tokens) and removes it again', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: '+ Add secondary' }))
    expect(screen.getByRole('region', { name: 'Secondary' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Export/ })).toHaveTextContent('128')
    await userEvent.click(screen.getByRole('button', { name: 'Remove Secondary' }))
    expect(screen.queryByRole('region', { name: 'Secondary' })).not.toBeInTheDocument()
  })

  it('adds a tertiary palette independently of secondary', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: '+ Add tertiary' }))
    expect(screen.getByRole('region', { name: 'Tertiary' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Export/ })).toHaveTextContent('128')
    expect(screen.queryByRole('region', { name: 'Secondary' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '+ Add secondary' }))
    expect(screen.getByRole('button', { name: /^Export/ })).toHaveTextContent('144')
  })

  it('adds utility colours named Utility 1, Utility 2 and so on, each with its own ramp and export', async () => {
    setup()
    const add = screen.getByRole('button', { name: '+ Add utility colour' })
    await userEvent.click(add)
    await userEvent.click(add)
    expect(screen.getByRole('region', { name: 'Utility 1' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Utility 2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Export/ })).toHaveTextContent('144')
    expect(screen.getByRole('textbox', { name: 'Utility 1 name' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Utility 1' })).getAllByRole('button').length).toBeGreaterThanOrEqual(16)
  })

  it('lets the user change a utility colour and its name', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: '+ Add utility colour' }))
    const hex = screen.getByRole('textbox', { name: 'Utility 1 hex' })
    expect(hex).toHaveValue('#0891b2')
    await userEvent.clear(hex)
    await userEvent.type(hex, '#FF8800')
    expect(useProject.getState().settings.utility[0].hex).toBe('#FF8800')
    expect(useProject.getState().settings.utility[0].name).toBe('Utility 1')
    const name = screen.getByRole('textbox', { name: 'Utility 1 name' })
    await userEvent.clear(name)
    await userEvent.type(name, 'Teal accent')
    expect(screen.getByRole('region', { name: 'Teal accent' })).toBeInTheDocument()
    expect(useProject.getState().settings.utility[0].id).toBe(1)
  })

  it('reuses the lowest free number, removes utilities, and stops at eight', async () => {
    setup()
    const add = screen.getByRole('button', { name: '+ Add utility colour' })
    for (let i = 0; i < 3; i++) await userEvent.click(add)
    await userEvent.click(screen.getByRole('button', { name: 'Remove Utility 2' }))
    expect(screen.queryByRole('region', { name: 'Utility 2' })).not.toBeInTheDocument()
    await userEvent.click(add)
    expect(screen.getByRole('region', { name: 'Utility 2' })).toBeInTheDocument()
    for (let i = 0; i < 5; i++) await userEvent.click(add)
    expect(useProject.getState().settings.utility).toHaveLength(8)
    expect(add).toBeDisabled()
  })

  it('shows tertiary and utility palettes in the Contrast chips and token picker data', () => {
    useProject.getState().setTertiary('#0EA5A4')
    useProject.getState().addUtility()
    const keys = buildPalettes(useProject.getState().settings).map((p) => p.key)
    expect(keys).toEqual(['primary', 'tertiary', 'utility-1', 'neutral', 'info', 'success', 'caution', 'warning', 'critical'])
    expect(pickerChips(buildPalettes(useProject.getState().settings)).map((c) => c.label)).toEqual(
      ['neutral', 'primary', 'tertiary', 'Utility 1', 'info', 'success', 'caution', 'warning', 'critical', 'black α', 'white α']
    )
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
