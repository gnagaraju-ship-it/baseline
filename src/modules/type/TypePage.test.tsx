import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProject } from '../../store/project'
import { TypePage } from './TypePage'

function setup() {
  return render(
    <MemoryRouter initialEntries={['/type']}>
      <TypePage />
    </MemoryRouter>
  )
}

const rowBtn = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}The quick`) })

describe('Type scale screen', () => {
  beforeEach(() => {
    useProject.getState().reset()
  })

  it('shows 11 steps in three groups with counts and sizes in rem', () => {
    setup()
    for (const t of ['HEADING', 'BODY', 'LABEL']) expect(screen.getByRole('region', { name: t })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'HEADING' })).getAllByRole('button', { name: /The quick/ })).toHaveLength(4)
    expect(screen.getByRole('tab', { name: /Scale/ })).toHaveTextContent('11')
    expect(screen.getByRole('button', { name: /^Export/ })).toHaveTextContent('11')
    expect(rowBtn('body-md')).toHaveTextContent('0.875rem')
    expect(rowBtn('body-md')).toHaveTextContent('24px')
  })

  it('opens heading-xl by default and toggles rows with aria-expanded', async () => {
    setup()
    expect(rowBtn('heading-xl')).toHaveAttribute('aria-expanded', 'true')
    expect(rowBtn('body-md')).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(rowBtn('body-md'))
    expect(rowBtn('body-md')).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(rowBtn('body-md'))
    expect(rowBtn('body-md')).toHaveAttribute('aria-expanded', 'false')
  })

  it('adds a weight variant row and raises the count', async () => {
    setup()
    await userEvent.click(rowBtn('heading-xl'))
    await userEvent.click(rowBtn('body-md'))
    await userEvent.click(screen.getByRole('button', { name: /^semibold/ }))
    expect(screen.getByText('body-md-semibold')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Scale/ })).toHaveTextContent('12')
    expect(screen.getByRole('button', { name: /^Export/ })).toHaveTextContent('12')
  })

  it('overrides line height and resets to the scale', async () => {
    setup()
    await userEvent.click(rowBtn('heading-xl'))
    await userEvent.click(rowBtn('body-md'))
    const lh = screen.getByLabelText('LINE HEIGHT (PX)')
    await userEvent.clear(lh)
    await userEvent.type(lh, '30')
    expect(rowBtn('body-md')).toHaveTextContent('30px')
    await userEvent.click(screen.getByRole('button', { name: 'Reset to scale' }))
    expect(rowBtn('body-md')).toHaveTextContent('24px')
    expect(screen.queryByRole('button', { name: 'Reset to scale' })).not.toBeInTheDocument()
  })

  it('changing base, ratio, grid and presets recomputes the scale', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'Comfortable' }))
    expect(screen.getByRole('button', { name: 'Comfortable' })).toHaveAttribute('aria-pressed', 'true')
    expect(rowBtn('body-md')).toHaveTextContent('1.000rem')
    await userEvent.selectOptions(screen.getByLabelText('Scale ratio'), '1.5')
    expect(screen.getByRole('button', { name: 'Comfortable' })).toHaveAttribute('aria-pressed', 'false')
    expect(useProject.getState().type.ratio).toBe(1.5)
    await userEvent.click(screen.getByRole('button', { name: '4px' }))
    expect(useProject.getState().type.grid).toBe(4)
    const num = screen.getByLabelText('Base size in px')
    await userEvent.clear(num)
    await userEvent.type(num, '18')
    expect(useProject.getState().type.base).toBe(18)
  })

  it('switches the unit', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'pt' }))
    expect(rowBtn('body-md')).toHaveTextContent('10.5pt')
    await userEvent.click(screen.getByRole('button', { name: 'px' }))
    expect(rowBtn('body-md')).toHaveTextContent('14px')
  })

  it('switches to iOS: 11 HIG styles, locked SF Pro fonts, pt unit, no responsive section', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'iOS' }))
    expect(screen.getAllByRole('button', { name: /The quick/ })).toHaveLength(11)
    expect(screen.getByLabelText('Heading / Display')).toBeDisabled()
    expect(screen.getByLabelText('Heading / Display')).toHaveValue('SF Pro Display')
    expect(screen.getByRole('button', { name: 'pt' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: 'rem' })).not.toBeInTheDocument()
    expect(rowBtn('body')).toHaveTextContent('17pt')
    expect(screen.queryByText('Responsive')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Modern' }))
    expect(rowBtn('body')).toHaveTextContent('24px')
  })

  it('hides a breakpoint view when its responsive switch is off', async () => {
    setup()
    const group = screen.getByRole('group', { name: 'Breakpoint' })
    expect(within(group).getAllByRole('button')).toHaveLength(3)
    await userEvent.click(screen.getByRole('switch', { name: 'Tablet scaling' }))
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['Desktop', 'Mobile'])
    await userEvent.click(within(group).getByRole('button', { name: 'Mobile' }))
    expect(rowBtn('heading-xl')).toHaveTextContent('1.328rem'.replace('1.328', (Math.round(25 * 0.85) / 16).toFixed(3)))
  })

  it('suggests fonts that pair with the other slot, each in its own typeface, and applies the choice', async () => {
    setup()
    const head = screen.getByRole('combobox', { name: 'Heading / Display' })
    await userEvent.click(head)
    const suggested = within(screen.getByRole('group', { name: 'Suggested' })).getAllByRole('option')
    expect(suggested[0]).toHaveTextContent('Raleway')
    expect(suggested[0]).toHaveTextContent('Pairs with Nunito')
    expect(within(suggested[0]).getByText('Raleway')).toHaveStyle({ fontFamily: "'Raleway Variable', 'Raleway', system-ui, sans-serif" })
    await userEvent.click(screen.getByRole('option', { name: /Playfair Display/ }))
    expect(useProject.getState().type.headingFont).toBe('Playfair Display')
    expect(screen.getByRole('region', { name: 'HEADING' })).toHaveTextContent('Playfair Display')
    expect(rowBtn('heading-xl').querySelector('span:nth-child(2)')).toHaveStyle({ fontFamily: "'Playfair Display Variable', 'Playfair Display', system-ui, sans-serif" })
    const body = screen.getByRole('combobox', { name: 'Body / Label' })
    await userEvent.click(body)
    expect(within(screen.getByRole('group', { name: 'Suggested' })).getAllByRole('option')[0]).toHaveTextContent('Pairs with Playfair Display')
  })

  it('follows Grid: turning MD off removes the Tablet view and disables its switch', async () => {
    setup()
    useProject.getState().toggleBreakpoint('md')
    const group = screen.getByRole('group', { name: 'Breakpoint' })
    await vi.waitFor(() => expect(within(group).getAllByRole('button')).toHaveLength(2))
    expect(within(group).queryByRole('button', { name: 'Tablet' })).not.toBeInTheDocument()
    const sw = screen.getByRole('switch', { name: 'Tablet scaling' })
    expect(sw).toBeDisabled()
    expect(sw).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText('off in Grids')).toBeInTheDocument()
    useProject.getState().toggleBreakpoint('md')
    expect(await within(group).findByRole('button', { name: 'Tablet' })).toBeInTheDocument()
  })

  it('shows the specimen on Preview and the CSS on Export, and downloads type.css', async () => {
    const click = vi.fn()
    const create = vi.spyOn(document, 'createElement')
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() })
    setup()
    await userEvent.click(screen.getByRole('tab', { name: 'Preview' }))
    expect(screen.getByRole('article', { name: 'Specimen' })).toHaveTextContent('A type scale you can see at a glance')
    await userEvent.click(screen.getByRole('tab', { name: 'Export' }))
    const css = screen.getByLabelText('Type CSS')
    expect(css).toHaveTextContent('--type-heading-xl-size: 1.563rem;')
    create.mockRestore()
    HTMLAnchorElement.prototype.click = click
    await userEvent.click(screen.getByRole('button', { name: /^Export/ }))
    expect(click).toHaveBeenCalled()
  })
})
