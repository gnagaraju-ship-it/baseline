import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProject } from '../../store/project'
import { GridsPage } from './GridsPage'

function setup() {
  return render(
    <MemoryRouter initialEntries={['/grids']}>
      <GridsPage />
    </MemoryRouter>
  )
}

const stat = (k: string) => screen.getByText(k, { selector: 'dt' }).nextElementSibling!

describe('Grids screen', () => {
  beforeEach(() => {
    useProject.getState().reset()
    useProject.getState().setUnit('px')
  })

  it('opens on XXL with three breakpoint pills, 12 columns and the seven stats', () => {
    setup()
    const group = screen.getByRole('group', { name: 'Breakpoint' })
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['XXL1400', 'MD768', 'XS390'])
    expect(within(group).getByRole('button', { name: /XXL/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('XXL · Expanded')
    expect(screen.getAllByTestId('grid-column')).toHaveLength(12)
    expect(stat('VIEWPORT')).toHaveTextContent('1400px')
    expect(stat('SIDEBAR')).toHaveTextContent('−272px')
    expect(stat('MARGINS')).toHaveTextContent('−32px')
    expect(stat('CONTENT')).toHaveTextContent('1096px')
    expect(stat('COLUMNS')).toHaveTextContent('12')
    expect(stat('GUTTER')).toHaveTextContent('24px')
    expect(stat('COLUMN')).toHaveTextContent('69.3px')
    expect(screen.getByText(/Sidebar: Expanded/)).toHaveTextContent('272px')
    expect(screen.getByRole('navigation', { name: 'Views' })).toHaveTextContent('12')
  })

  it('switches breakpoint and shows its own columns, gutter and sidebar', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: /MD/ }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('MD · Collapsed rail')
    expect(screen.getAllByTestId('grid-column')).toHaveLength(8)
    expect(screen.getByLabelText('COLUMNS')).toHaveValue(8)
    expect(screen.getByLabelText('GUTTER (PX)')).toHaveValue(16)
    expect(stat('SIDEBAR')).toHaveTextContent('−72px')
    await userEvent.click(screen.getByRole('button', { name: /XS/ }))
    expect(screen.getByText(/Sidebar: Hidden/)).toHaveTextContent('0px')
    expect(screen.getAllByTestId('grid-column')).toHaveLength(4)
  })

  it('toggles sidebar, floating and max content width', async () => {
    setup()
    await userEvent.click(screen.getByRole('switch', { name: 'Floating' }))
    expect(screen.getByText(/floats over the content/)).toBeInTheDocument()
    expect(stat('SIDEBAR')).toHaveTextContent('0px')
    expect(stat('CONTENT')).toHaveTextContent('1368px')
    await userEvent.click(screen.getByRole('switch', { name: 'Max content width' }))
    expect(stat('CONTENT')).toHaveTextContent('1200px')
    expect(stat('MARGINS')).toHaveTextContent('−200px')
    await userEvent.click(screen.getByRole('switch', { name: 'Sidebar' }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('XXL · No sidebar')
    expect(screen.getByText(/Sidebar: Off/)).toBeInTheDocument()
    expect(screen.getByText(/No sidebar reserved/)).toBeInTheDocument()
  })

  it('editing columns and gutter updates the column width, and a gutter edit flips the preset to Custom', async () => {
    setup()
    expect(screen.getByRole('button', { name: 'Standard' })).toHaveAttribute('aria-pressed', 'true')
    const cols = screen.getByLabelText('COLUMNS')
    await userEvent.clear(cols)
    await userEvent.type(cols, '6')
    expect(screen.getAllByTestId('grid-column')).toHaveLength(6)
    const gut = screen.getByLabelText('GUTTER (PX)')
    await userEvent.clear(gut)
    await userEvent.type(gut, '20')
    expect(stat('GUTTER')).toHaveTextContent('20px')
    expect(stat('COLUMN')).toHaveTextContent(String(+((1096 - 5 * 20) / 6).toFixed(1)))
    expect(screen.getByRole('button', { name: 'Custom' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Standard' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('applies presets to the gutters and margins of every breakpoint', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'Airy' }))
    expect(stat('GUTTER')).toHaveTextContent('32px')
    expect(stat('MARGINS')).toHaveTextContent('−64px')
    await userEvent.click(screen.getByRole('button', { name: /XS/ }))
    expect(stat('GUTTER')).toHaveTextContent('16px')
    expect(stat('MARGINS')).toHaveTextContent('−40px')
  })

  it('disables a breakpoint, moves the active one, and refuses to disable the last', async () => {
    setup()
    await userEvent.click(screen.getByRole('checkbox', { name: 'XXL' }))
    expect(screen.getByText('2 ON')).toBeInTheDocument()
    const group = screen.getByRole('group', { name: 'Breakpoint' })
    expect(within(group).getAllByRole('button')).toHaveLength(2)
    expect(within(group).getByRole('button', { name: /MD/ })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('checkbox', { name: 'MD' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'XS' }))
    expect(screen.getByRole('checkbox', { name: 'XS' })).toBeChecked()
    expect(screen.getByText('1 ON')).toBeInTheDocument()
  })

  it('converts values with the unit switch', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'rem' }))
    expect(stat('VIEWPORT')).toHaveTextContent('87.5rem')
    expect(stat('GUTTER')).toHaveTextContent('1.5rem')
    await userEvent.click(screen.getByRole('button', { name: 'pt' }))
    expect(stat('VIEWPORT')).toHaveTextContent('1050pt')
  })

  it('disables the add-breakpoint button and keeps platform as a stored choice', async () => {
    setup()
    expect(screen.getByRole('button', { name: /Add breakpoint/ })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Phone' }))
    expect(screen.getByRole('button', { name: 'Phone' })).toHaveAttribute('aria-pressed', 'true')
    expect(stat('VIEWPORT')).toHaveTextContent('1400px')
  })

  it('opens the export settings preselected for Grids', async () => {
    const click = vi.fn()
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() })
    HTMLAnchorElement.prototype.click = click
    setup()
    expect(screen.getByRole('button', { name: /^Export/ })).toHaveTextContent('3')
    await userEvent.click(screen.getByRole('checkbox', { name: 'MD' }))
    expect(screen.getByRole('button', { name: /^Export/ })).toHaveTextContent('2')
    await userEvent.click(screen.getByRole('button', { name: /^Export/ }))
    expect(useProject.getState().exportDialog).toMatchObject({ open: true, modules: ['grids'] })
  })
})
