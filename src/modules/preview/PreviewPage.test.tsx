import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProject } from '../../store/project'
import { PreviewPage } from './PreviewPage'

function setup() {
  return render(
    <MemoryRouter initialEntries={['/preview']}>
      <PreviewPage />
    </MemoryRouter>
  )
}

const canvas = () => screen.getByTestId('preview-canvas')

describe('UI preview (Charts)', () => {
  beforeEach(() => {
    useProject.getState().reset()
  })

  it('shows the five chart cards with text alternatives', () => {
    setup()
    expect(screen.getAllByRole('figure')).toHaveLength(5)
    for (const t of ['Revenue vs Expenses', 'User Growth', 'Traffic by Platform', 'Audience Breakdown', 'Quarterly Goals']) {
      expect(screen.getByText(t)).toBeInTheDocument()
    }
    expect(screen.getAllByRole('img')).toHaveLength(4)
    expect(screen.getByRole('img', { name: /Donut chart: Primary 42%, Secondary 28%, Tertiary 18%, Other 12%/ })).toBeInTheDocument()
  })

  it('has Charts pressed and the other seven preview types disabled', () => {
    setup()
    const group = screen.getByRole('group', { name: 'Preview type' })
    const buttons = within(group).getAllByRole('button')
    expect(buttons).toHaveLength(8)
    expect(within(group).getByRole('button', { name: 'Charts' })).toHaveAttribute('aria-pressed', 'true')
    expect(buttons.filter((b) => (b as HTMLButtonElement).disabled)).toHaveLength(7)
  })

  it('exposes progress bars with their values', () => {
    setup()
    const bars = screen.getAllByRole('progressbar')
    expect(bars.map((b) => b.getAttribute('aria-valuenow'))).toEqual(['78', '64', '91', '55'])
  })

  it('switches Light and Dark and repaints the canvas', async () => {
    setup()
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true')
    expect(canvas()).toHaveStyle({ background: '#F5F6F8' })
    await userEvent.click(screen.getByRole('button', { name: 'Dark' }))
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true')
    expect(canvas()).toHaveStyle({ background: '#030712' })
    expect(within(canvas()).getAllByRole('figure')[0]).toHaveStyle({ background: '#161E2C' })
  })

  it('follows the brand colour in the series', () => {
    setup()
    const bar = () => canvas().querySelector('svg rect')!
    expect(bar()).toHaveAttribute('fill', '#AD2CE8')
    useProject.getState().setText('primary', '#0EA5E9')
    return vi.waitFor(() => expect(bar().getAttribute('fill')).not.toBe('#AD2CE8'))
  })

  it('is the active tab and exports the ramp CSS count', () => {
    setup()
    expect(within(screen.getByRole('navigation', { name: 'Views' })).getByRole('link', { name: /UI preview/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: /^Export/ })).toHaveTextContent('112')
  })
})
