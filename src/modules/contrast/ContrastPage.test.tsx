import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { useProject } from '../../store/project'
import { ContrastPage } from './ContrastPage'

function setup() {
  return render(
    <MemoryRouter initialEntries={['/contrast']}>
      <ContrastPage />
    </MemoryRouter>
  )
}

describe('Contrast grid screen', () => {
  beforeEach(() => {
    useProject.getState().reset()
  })

  it('renders an 18 x 18 grid with headers, defaulting to Primary, APCA 60+ and cell 3 on 10', () => {
    setup()
    const grid = screen.getByRole('grid', { name: 'Primary contrast grid' })
    expect(within(grid).getAllByRole('row')).toHaveLength(19)
    expect(within(grid).getAllByRole('gridcell')).toHaveLength(18 * 18)
    expect(within(grid).getAllByRole('columnheader')).toHaveLength(18)
    expect(within(grid).getAllByRole('rowheader')).toHaveLength(18)
    expect(screen.getByRole('button', { name: 'WCAG 3 · APCA' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '60+' })).toHaveAttribute('aria-pressed', 'true')
    const sel = within(grid).getAllByRole('gridcell').filter((c) => c.getAttribute('aria-selected') === 'true')
    expect(sel).toHaveLength(1)
    expect(sel[0]).toHaveAttribute('id', 'cg-3-10')
    expect(screen.getByLabelText('Selected pair')).toHaveTextContent('3 on 10')
  })

  it('marks the diagonal as the same colour', () => {
    setup()
    expect(screen.getByRole('gridcell', { name: '5 text on 5: same colour' })).toHaveTextContent('—')
  })

  it('fills only the cells that meet the threshold', async () => {
    setup()
    const black = screen.getByRole('gridcell', { name: /^Black text on White: 10\d/ })
    expect(black).toHaveAttribute('aria-label', expect.stringContaining('meets threshold'))
    const faint = screen.getByRole('gridcell', { name: /^1 text on White: / })
    expect(faint.getAttribute('aria-label')).not.toContain('meets threshold')
    await userEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getAllByRole('gridcell').every((c) => !c.getAttribute('aria-label')!.includes('meets threshold'))).toBe(true)
  })

  it('switches to WCAG 2 with its own thresholds and ratio text', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'WCAG 2' }))
    expect(screen.getAllByRole('button', { name: /^(3 : 1|4\.5 : 1|7 : 1|All)$/ })).toHaveLength(4)
    expect(screen.getByRole('button', { name: '4.5 : 1' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('gridcell', { name: 'Black text on White: 21.0, meets threshold' })).toBeInTheDocument()
    expect(screen.getByLabelText('Selected pair')).toHaveTextContent(/\d\.\d\d:1/)
  })

  it('keeps each standard\'s threshold when switching back', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: '90+' }))
    await userEvent.click(screen.getByRole('button', { name: 'WCAG 2' }))
    await userEvent.click(screen.getByRole('button', { name: '7 : 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'WCAG 3 · APCA' }))
    expect(screen.getByRole('button', { name: '90+' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('updates the detail card and checklist when a cell is selected', async () => {
    setup()
    await userEvent.click(screen.getByRole('gridcell', { name: /^Black text on White:/ }))
    const card = screen.getByLabelText('Selected pair')
    expect(card).toHaveTextContent('Black on White')
    expect(card).toHaveTextContent(/Lc 10\d/)
    expect(card.textContent).not.toContain('✕')
    await userEvent.click(screen.getByRole('gridcell', { name: /^1 text on White:/ }))
    expect(card.textContent).toContain('✕')
  })

  it('moves the selection with arrow keys and keeps one tab stop', async () => {
    setup()
    const start = screen.getByRole('gridcell', { selected: true })
    start.focus()
    await userEvent.keyboard('{ArrowRight}{ArrowDown}')
    expect(screen.getByRole('gridcell', { selected: true })).toHaveAttribute('id', 'cg-4-11')
    expect(screen.getByRole('gridcell', { selected: true })).toHaveFocus()
    expect(screen.getAllByRole('gridcell').filter((c) => c.tabIndex === 0)).toHaveLength(1)
    await userEvent.keyboard('{End}')
    expect(screen.getByRole('gridcell', { selected: true })).toHaveAttribute('id', 'cg-4-17')
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('gridcell', { selected: true })).toHaveAttribute('id', 'cg-4-17')
  })

  it('switches palette from the chips', async () => {
    setup()
    expect(within(screen.getByRole('group', { name: 'Palette' })).getAllByRole('button')).toHaveLength(7)
    await userEvent.click(within(screen.getByRole('group', { name: 'Palette' })).getByRole('button', { name: 'Info' }))
    expect(screen.getByRole('grid', { name: 'Info contrast grid' })).toBeInTheDocument()
  })

  it('follows the brand colour and falls back when the chosen palette is removed', () => {
    setup()
    useProject.getState().setContrastPalette('success')
    useProject.getState().setSemanticEnabled(false)
    return screen.findByRole('grid', { name: 'Primary contrast grid' })
  })

  it('shows the Palette and Contrast tabs with counts and exports the ramp CSS count', () => {
    setup()
    expect(screen.getByRole('link', { name: /Contrast grid/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: /^Export/ })).toHaveTextContent('112')
  })
})
