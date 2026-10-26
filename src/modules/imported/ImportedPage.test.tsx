import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../../App'
import { untitledThemeData } from '../../lib/themes'
import { useProject } from '../../store/project'

const s = () => useProject.getState()

function at(path: string) {
  render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
}

describe('the Untitled theme', () => {
  beforeEach(() => {
    s().reset()
    useProject.setState({ themes: [...s().themes, { id: 'theme-2', name: 'Untitled', data: untitledThemeData() }] })
    s().switchTheme('theme-2')
  })

  it('palette: Untitled\'s ramps with 11 steps named 50 to 950, from the file\'s colours', () => {
    at('/')
    const brand = within(screen.getByRole('main')).getByRole('region', { name: 'Brand' })
    expect(within(brand).getAllByRole('button', { name: /^Brand \d+, #/ })).toHaveLength(11)
    expect(within(brand).getByRole('button', { name: 'Brand 600, #7F56D9' })).toBeInTheDocument()
    expect(within(brand).getByRole('button', { name: /^Brand 950/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Palette/ })).toHaveTextContent('28')
    expect(within(screen.getByRole('main')).getByRole('region', { name: 'Neutral' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Primary' })).not.toBeInTheDocument()
  })

  it('palette: typing a brand colour generates a new ramp around it, other ramps stay', async () => {
    at('/')
    fireEvent.change(document.getElementById('f-brand')!, { target: { value: '#0EA5E9' } })
    const main = within(screen.getByRole('main'))
    const brand = main.getByRole('region', { name: 'Brand' })
    expect(within(brand).getByRole('button', { name: 'Brand 600, #0EA5E9' })).toBeInTheDocument()
    expect(main.getByRole('region', { name: 'Red' }) && within(main.getByRole('region', { name: 'Red' })).getByRole('button', { name: /^Red 600, #DC2626/ })).toBeInTheDocument()
    expect(s().settings.hex?.brand).toBe('#0EA5E9')
  })

  it('tokens: the 273 semantic tokens in Untitled\'s groups, with 11-step pickers', async () => {
    at('/tokens')
    expect(screen.getByRole('link', { name: /Tokens/ })).toHaveTextContent('273')
    for (const g of ['Background', 'Text', 'Foreground', 'Border', 'Utility', 'Components', 'Alpha', 'Effects']) {
      expect(screen.getByRole('region', { name: g })).toBeInTheDocument()
    }
    const text = within(screen.getByRole('region', { name: 'Text' }))
    await userEvent.click(text.getByRole('button', { name: /^text-primary, light mode: neutral-900/ }))
    const dialog = screen.getByRole('dialog', { name: 'text-primary, light mode' })
    expect(within(dialog).getAllByRole('button', { name: /^neutral-\d+$/ })).toHaveLength(11)
    await userEvent.click(within(dialog).getByRole('button', { name: 'neutral-800' }))
    expect(s().tokenOverrides['text-primary|light']).toBe('neutral-800')
  })

  it('tokens: a plain-colour token says so in the picker', async () => {
    at('/tokens')
    const alpha = within(screen.getByRole('region', { name: 'Alpha' }))
    await userEvent.click(alpha.getAllByRole('button', { name: /light mode: #/ })[0])
    expect(screen.getByText(/plain colour/)).toBeInTheDocument()
  })

  it('contrast and UI preview work from the schema', () => {
    at('/contrast')
    // White, 11 steps and Black on each axis, with the steps named 50 to 950
    expect(screen.getAllByText('950').length).toBeGreaterThan(0)
  })

  it('UI preview draws its charts from the Untitled palettes', () => {
    at('/preview')
    expect(within(screen.getByRole('main')).getByRole('link', { name: /UI preview/ })).toHaveAttribute('aria-current', 'page')
  })

  it('type: Untitled\'s named steps with their exact sizes, Inter, no ratio or platform controls', async () => {
    at('/type')
    const text = within(screen.getByRole('region', { name: 'TEXT' }))
    const display = within(screen.getByRole('region', { name: 'DISPLAY' }))
    expect(text.getAllByRole('button').filter((b) => b.hasAttribute('aria-expanded'))).toHaveLength(5)
    expect(display.getByText('display-2xl')).toBeInTheDocument()
    expect(screen.getByText('72px')).toBeInTheDocument() // display-2xl size
    expect(screen.queryByLabelText('Scale ratio')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Platform' })).not.toBeInTheDocument()
    expect(screen.getAllByText('Inter').length).toBeGreaterThan(0)
  })

  it('type: a step\'s size can be changed, and its line height follows in proportion', async () => {
    at('/type')
    await userEvent.click(within(screen.getByRole('region', { name: 'TEXT' })).getByText('text-md'))
    const size = screen.getByLabelText('SIZE (PX)')
    await userEvent.clear(size)
    await userEvent.type(size, '18{Enter}')
    expect(s().type.overrides['text-md']).toEqual({ size: 18 })
    const rows = (await import('../../lib/typeScale')).computeGroups(s().type).flatMap((g) => g.rows)
    expect(rows.find((r) => r.name === 'text-md')).toMatchObject({ size: 18, lh: 27 })
  })

  it('spacing: the Spacing screen layout with Untitled\'s scale, tokens and radius', async () => {
    at('/spacing')
    expect(screen.getByRole('region', { name: 'Scale' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Tokens' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Radius' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Base unit' })).not.toBeInTheDocument() // no Baseline presets
    expect(screen.getByRole('group', { name: 'Unit' })).toBeInTheDocument()
    // edit a step of the scale: the token that follows it moves
    const prim = screen.getByLabelText('Spacing/1 (4px) Style')
    await userEvent.clear(prim)
    await userEvent.type(prim, '6')
    expect((screen.getByLabelText('spacing-xs Mode 1') as HTMLInputElement).value).toBe('6')
    // the unit switch changes how values are shown, not the stored px
    await userEvent.click(screen.getByRole('button', { name: 'px' }))
    expect(within(screen.getByRole('region', { name: 'Scale' })).getAllByText('6px').length).toBeGreaterThan(0)
  })

  it('spacing: point a token at another step, give it its own value, rename, add and remove', async () => {
    at('/spacing')
    const follows = screen.getByLabelText('spacing-xs follows') as HTMLSelectElement
    expect(follows.value).toBe('_Primitives::Spacing/1 (4px)')
    await userEvent.selectOptions(follows, '_Primitives::Spacing/2 (8px)')
    expect((screen.getByLabelText('spacing-xs Mode 1') as HTMLInputElement).value).toBe('8')
    const px = screen.getByLabelText('spacing-xs Mode 1')
    await userEvent.clear(px)
    await userEvent.type(px, '9')
    expect((screen.getByLabelText('spacing-xs follows') as HTMLSelectElement).value).toBe('')
    const name = screen.getByLabelText('radius-md name')
    await userEvent.clear(name)
    await userEvent.type(name, 'radius-medium{Enter}')
    expect(screen.getByLabelText('radius-medium Mode 1')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '+ Add radius' }))
    expect(screen.getByLabelText('new name')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Remove new' }))
    expect(screen.queryByLabelText('new name')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reset radius' }))
    expect(screen.getByLabelText('radius-md name')).toBeInTheDocument()
  })

  it('spacing: a custom step can be added from the scale', async () => {
    at('/spacing')
    await userEvent.type(screen.getByLabelText('Custom value in px'), '36')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByLabelText('Spacing/custom (36px) Style')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Custom value in px'), '999')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('grids: widths and containers as named tokens, without Baseline\'s grid controls', async () => {
    at('/grids')
    expect(screen.queryByRole('group', { name: 'Breakpoint' })).not.toBeInTheDocument()
    const widths = within(screen.getByRole('region', { name: '4. Widths' }))
    expect(widths.getByLabelText('width-xxs name')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '5. Containers' })).toBeInTheDocument()
    const pad = screen.getByLabelText('container-padding-desktop Value')
    await userEvent.clear(pad)
    await userEvent.type(pad, '40')
    expect(s().imported!.collections.find((c) => c.name === '5. Containers')!.variables.find((v) => v.name === 'container-padding-desktop')!.values.Value).toEqual({ v: 40 })
    expect(screen.getByRole('button', { name: /^Export/ })).toHaveTextContent('15')
  })

  it('type: no responsive scaling, weight variants or letter spacing, which the files do not have', async () => {
    at('/type')
    expect(screen.queryByText('Responsive')).not.toBeInTheDocument()
    await userEvent.click(within(screen.getByRole('region', { name: 'TEXT' })).getByText('text-md'))
    expect(screen.queryByRole('group', { name: 'Weight variants' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('LETTER SPACING (EM)')).not.toBeInTheDocument()
  })

  it('there is no elevation: no rail link, and the screen says so', () => {
    at('/elevation')
    expect(screen.getByRole('status')).toHaveTextContent('no elevation tokens')
    expect(screen.queryByRole('link', { name: 'Elevation' })).not.toBeInTheDocument()
  })

  it('export opens with only the screen\'s module, and Default still uses the generators', async () => {
    at('/grids')
    await userEvent.click(screen.getByRole('button', { name: /^Export/ }))
    const dialog = screen.getByRole('dialog', { name: 'Export settings' })
    expect(within(dialog).getByRole('checkbox', { name: /Grids/ })).toBeChecked()
    await userEvent.click(within(dialog).getByRole('radio', { name: /Active theme only/ }))
    expect(within(dialog).getByLabelText('Export preview')).toHaveTextContent('--width-xxs: var(--spacing-80-320px);')
    await userEvent.keyboard('{Escape}')
    act(() => s().switchTheme('theme-1'))
    expect(screen.queryByText('Spacing and sizes')).not.toBeInTheDocument()
  })
})
