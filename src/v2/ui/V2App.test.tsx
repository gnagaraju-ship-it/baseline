import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../../App'
import { useProject } from '../../store/project'
import { resetV2, useV2 } from '../store'

function at(path: string) {
  render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
}

describe('v2 screens', () => {
  beforeEach(() => { localStorage.clear(); resetV2(); useProject.getState().reset() })

  it('v1 is untouched: its routes still show the v1 screens, with a link to v2', () => {
    at('/')
    expect(screen.getByRole('link', { name: 'Open v2' })).toHaveAttribute('href', '/v2')
    expect(screen.getByRole('link', { name: /Palette/ })).toBeInTheDocument()
    expect(screen.queryByText('Baseline v2')).not.toBeInTheDocument()
  })

  it('/v2 shows Default\'s 16-step ramps and a way back to v1', () => {
    at('/v2')
    expect(screen.getByText('Baseline v2')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to v1' })).toHaveAttribute('href', '/')
    const primary = within(screen.getByRole('main')).getByRole('region', { name: 'Primary' })
    expect(within(primary).getAllByRole('img')).toHaveLength(16)
    expect(within(primary).getByRole('img', { name: 'Primary 10, #9D00D6' })).toBeInTheDocument()
  })

  it('switching to Untitled shows 11-step ramps named 50 to 950', async () => {
    at('/v2')
    await userEvent.click(screen.getByRole('button', { name: 'Untitled' }))
    const brand = within(screen.getByRole('main')).getByRole('region', { name: 'Brand' })
    expect(within(brand).getAllByRole('img')).toHaveLength(11)
    expect(within(brand).getByRole('img', { name: 'Brand 600, #7F56D9' })).toBeInTheDocument()
    expect(within(brand).getByRole('img', { name: /^Brand 950/ })).toBeInTheDocument()
    expect(document.title).toContain('Untitled')
  })

  it('a typed colour regenerates only that ramp, and a theme keeps its own colours', async () => {
    at('/v2')
    fireEvent.change(document.getElementById('f-primary')!, { target: { value: '#0EA5E9' } })
    const main = within(screen.getByRole('main'))
    expect(main.getByRole('img', { name: 'Primary 10, #0EA5E9' })).toBeInTheDocument()
    expect(within(main.getByRole('region', { name: 'Info' })).getByRole('img', { name: /^Info 10, #2563EB/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'New' }))
    expect((screen.getByLabelText('Theme') as HTMLSelectElement).selectedOptions[0].textContent).toBe('Base copy')
    fireEvent.change(document.getElementById('f-primary')!, { target: { value: '#111111' } })
    await userEvent.selectOptions(screen.getByLabelText('Theme'), 'base')
    expect(main.getByRole('img', { name: 'Primary 10, #0EA5E9' })).toBeInTheDocument()
  })

  it('tokens: groups, remap by picking a ramp step, and reset', async () => {
    at('/v2/tokens')
    expect(screen.getByRole('region', { name: 'Backgrounds' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Text' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^bg-fill, Light: primary\/10\. Change/ }))
    const dialog = screen.getByRole('dialog', { name: 'bg-fill, Light' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Info' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Info 8' }))
    expect(screen.getByRole('button', { name: /^bg-fill, Light: info\/8 \(changed\)/ })).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reset this value' }))
    expect(screen.getByRole('button', { name: /^bg-fill, Light: primary\/10\. Change/ })).toBeInTheDocument()
  })

  it('tokens: Untitled\'s own groups and 11-step pickers', async () => {
    at('/v2/tokens')
    await userEvent.click(screen.getByRole('button', { name: 'Untitled' }))
    for (const g of ['Background', 'Text', 'Foreground', 'Border', 'Utility']) expect(screen.getByRole('region', { name: g })).toBeInTheDocument()
    await userEvent.click(within(screen.getByRole('region', { name: 'Text' })).getAllByRole('button', { name: /^Colors\/Text\/text-primary \(900\), Light mode/ })[0])
    const dialog = screen.getByRole('dialog', { name: /text-primary \(900\), Light mode/ })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Neutral' }))
    expect(within(dialog).getAllByRole('button', { name: /^Neutral \d+$/ })).toHaveLength(11)
  })

  it('export: CSS by default, JSON for the plugin, collections can be left out', async () => {
    at('/v2')
    await userEvent.click(screen.getByRole('button', { name: 'Export' }))
    const dialog = screen.getByRole('dialog', { name: /Export Default/ })
    expect(within(dialog).getByLabelText('Export preview')).toHaveTextContent('--primary-1:')
    expect(within(dialog).getByText(/ tokens · default-base\.css/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /Primitives/ }))
    expect(within(dialog).getByLabelText('Export preview')).not.toHaveTextContent('--primary-1:')
    await userEvent.click(within(dialog).getByRole('radio', { name: /Design tokens JSON/ }))
    expect(within(dialog).getByLabelText('Export preview')).toHaveTextContent('"Semantic"')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: /Export Default/ })).not.toBeInTheDocument()
  })

  it('type: Default\'s scale in three groups, driven by base size and ratio', async () => {
    at('/v2/type')
    for (const g of ['HEADING', 'BODY', 'LABEL']) expect(screen.getByRole('region', { name: g })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'body-md, 14px, line 24px' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Base size'), { target: { value: '16' } })
    expect(screen.getByRole('button', { name: 'body-md, 16px, line 24px' })).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Scale ratio'), '1.25')
    expect(useV2.getState().themes.default[0].type).toMatchObject({ base: 16, ratio: 1.25 })
    const heading = screen.getByLabelText('Heading font')
    await userEvent.clear(heading)
    await userEvent.type(heading, 'Inter')
    expect(useV2.getState().themes.default[0].type?.headingFont).toBe('Inter')
  })

  it('type: a single step can be set by hand and put back', async () => {
    at('/v2/type')
    await userEvent.click(screen.getByRole('button', { name: /^body-md, 14px/ }))
    const size = screen.getByLabelText('SIZE (PX)')
    await userEvent.clear(size)
    await userEvent.type(size, '20')
    expect(screen.getByRole('button', { name: /^body-md, 20px/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reset this step' }))
    expect(screen.getByRole('button', { name: /^body-md, 14px/ })).toBeInTheDocument()
  })

  it('type: Untitled\'s named steps with their exact sizes, and no scale controls', async () => {
    at('/v2/type')
    await userEvent.click(screen.getByRole('button', { name: 'Untitled' }))
    expect(screen.getByRole('region', { name: 'TEXT' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'DISPLAY' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'text-md, 16px, line 24px' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'display-2xl, 72px, line 90px' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Scale ratio')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('LETTER SPACING (EM)')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^text-md, 16px/ }))
    expect(screen.queryByLabelText('LETTER SPACING (EM)')).not.toBeInTheDocument()
    const size = screen.getByLabelText('SIZE (PX)')
    await userEvent.clear(size)
    await userEvent.type(size, '18')
    expect(screen.getByRole('button', { name: 'text-md, 18px, line 27px' })).toBeInTheDocument()
  })

  it('export includes the type collection', async () => {
    at('/v2')
    await userEvent.click(screen.getByRole('button', { name: 'Export' }))
    const dialog = screen.getByRole('dialog', { name: /Export Default/ })
    expect(within(dialog).getByRole('checkbox', { name: /Type/ })).toBeChecked()
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /Primitives/ }))
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /Semantic/ }))
    expect(within(dialog).getByLabelText('Export preview')).toHaveTextContent('--type-heading-xl-size:')
  })

  it('v2 never writes what v1 saves', async () => {
    localStorage.setItem('baseline-project', 'v1 data')
    at('/v2')
    await userEvent.click(screen.getByRole('button', { name: 'Untitled' }))
    expect(localStorage.getItem('baseline-project')).toBe('v1 data')
    expect(useV2.getState().activeSystemId).toBe('untitled')
  })
})
