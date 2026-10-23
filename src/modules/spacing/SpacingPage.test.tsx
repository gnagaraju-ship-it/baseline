import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProject } from '../../store/project'
import { SpacingPage } from './SpacingPage'

function setup() {
  return render(
    <MemoryRouter initialEntries={['/spacing']}>
      <SpacingPage />
    </MemoryRouter>
  )
}

const tokenRow = (name: string) => screen.getByRole('rowheader', { name }).parentElement!

describe('Spacing screen', () => {
  beforeEach(() => {
    useProject.getState().reset()
    useProject.getState().setUnit('px')
  })

  it('opens on the 4px base with 17 of 23 steps on and the four token groups', () => {
    setup()
    expect(screen.getByRole('button', { name: '4px base' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/17 of 23 on/)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: '24px' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: '28px' })).not.toBeChecked()
    for (const g of ['GRID', 'SECTION', 'STACK', 'INSET']) expect(screen.getByRole('rowgroup', { name: g })).toBeInTheDocument()
    expect(within(tokenRow('stack-md')).getAllByRole('cell').map((c) => c.textContent)).toEqual(['16px', '16px', '12px'])
    expect(screen.getByRole('button', { name: /^Export/ })).toHaveTextContent('17')
    expect(screen.queryByText('off-scale')).not.toBeInTheDocument()
  })

  it('flags token values whose step is switched off and clears the flag when it is back on', async () => {
    setup()
    await userEvent.click(screen.getByRole('checkbox', { name: '24px' }))
    expect(screen.getByText(/16 of 23 on/)).toBeInTheDocument()
    expect(within(tokenRow('grid-gutter')).getByText('off-scale')).toBeInTheDocument()
    expect(within(tokenRow('stack-lg')).getByText('off-scale')).toBeInTheDocument()
    expect(screen.getAllByText('off-scale')).toHaveLength(4)
    await userEvent.click(screen.getByRole('checkbox', { name: '24px' }))
    expect(screen.queryByText('off-scale')).not.toBeInTheDocument()
  })

  it('changing the base resets the scale and drops custom values', async () => {
    setup()
    await userEvent.type(screen.getByLabelText('Custom value in px'), '18')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByRole('checkbox', { name: '18px' })).toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: '8px base' }))
    expect(screen.getByText(/13 of 15 on/)).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: '18px' })).not.toBeInTheDocument()
    expect(within(tokenRow('stack-md')).getAllByText('off-scale').length).toBeGreaterThan(0)
  })

  it('adds a custom value in order, switches an existing one on, and rejects invalid input', async () => {
    setup()
    const input = screen.getByLabelText('Custom value in px')
    await userEvent.type(input, '18{Enter}')
    const boxes = screen.getAllByRole('checkbox').filter((c) => c.id.startsWith('sp-'))
    expect(boxes.map((b) => b.id)).toContain('sp-18')
    expect(boxes.findIndex((b) => b.id === 'sp-18')).toBe(boxes.findIndex((b) => b.id === 'sp-16') + 1)
    expect(screen.getByText(/18 of 24 on/)).toBeInTheDocument()
    await userEvent.type(input, '28{Enter}')
    expect(screen.getByRole('checkbox', { name: '28px' })).toBeChecked()
    expect(screen.getByText(/19 of 24 on/)).toBeInTheDocument()
    await userEvent.type(input, '999{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('0 to 400')
    expect(screen.getByText(/19 of 24 on/)).toBeInTheDocument()
  })

  it('follows Grid breakpoints when Same as Grid is on, and locks the checkboxes', async () => {
    setup()
    expect(screen.getByRole('switch', { name: 'Same as Grid' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'XXL' })).toBeDisabled()
    expect(screen.getByText('3 ON')).toBeInTheDocument()
    useProject.getState().toggleBreakpoint('md')
    expect(await screen.findByText('2 ON')).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['TOKEN', 'XXL', 'XS'])
    expect(within(tokenRow('stack-md')).getAllByRole('cell').map((c) => c.textContent)).toEqual(['16px', '12px'])
  })

  it('lets breakpoints be set independently when Same as Grid is off', async () => {
    setup()
    await userEvent.click(screen.getByRole('switch', { name: 'Same as Grid' }))
    expect(screen.getByRole('checkbox', { name: 'XXL' })).toBeEnabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'XXL' }))
    expect(screen.getByText('2 ON')).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['TOKEN', 'MD', 'XS'])
  })

  it('reads the grid margin and gutter from the Grid module', () => {
    useProject.getState().applyGridPreset('airy')
    setup()
    expect(within(tokenRow('grid-margin')).getAllByRole('cell').map((c) => c.textContent)).toEqual(['32px', '24px', '20px'])
    expect(within(tokenRow('grid-gutter')).getAllByRole('cell')[0]).toHaveTextContent('32px')
  })

  it('converts values with the unit switch', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'rem' }))
    expect(screen.getByRole('checkbox', { name: '1.5rem' })).toBeInTheDocument()
    expect(within(tokenRow('stack-md')).getAllByRole('cell')[0]).toHaveTextContent('1rem')
    await userEvent.click(screen.getByRole('button', { name: 'pt' }))
    expect(screen.getByRole('checkbox', { name: '18pt' })).toBeInTheDocument()
  })

  it('exports spacing.css', async () => {
    const click = vi.fn()
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() })
    HTMLAnchorElement.prototype.click = click
    setup()
    await userEvent.click(screen.getByRole('button', { name: /^Export/ }))
    expect(click).toHaveBeenCalled()
  })
})
