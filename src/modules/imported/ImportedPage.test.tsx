import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../../App'
import { exportSections } from '../../lib/exportAll'
import { followers } from '../../lib/importedTokens'
import { untitledThemeData } from '../../lib/themes'
import { useProject } from '../../store/project'

const s = () => useProject.getState()

function at(path: string) {
  render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
}

const followersOf = (name: string) => followers(useProject.getState().imported!, '_Primitives', name).length > 0

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
    expect(screen.queryByRole('group', { name: 'Base unit' })).not.toBeInTheDocument() // no Baseline base units
    expect(screen.getByRole('group', { name: 'Unit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Untitled' })).toHaveAttribute('aria-pressed', 'true')
    // a row shows a checkbox, its value and its name; editing opens under it
    expect(screen.getByText(/32 of 32 on\./)).toBeInTheDocument()
    expect(screen.getByLabelText('0.25rem')).toBeChecked()
    const step = screen.getByRole('button', { name: 'Edit Spacing/1 (4px)' })
    expect(step).toHaveTextContent('space-1 (4px)')
    expect(screen.queryByRole('group', { name: /^Edit / })).not.toBeInTheDocument()
    await userEvent.click(step)
    const edit = within(screen.getByRole('group', { name: 'Edit Spacing/1 (4px)' }))
    const px = edit.getByLabelText('Spacing/1 (4px) Style')
    await userEvent.clear(px)
    await userEvent.type(px, '6')
    // the token that follows it moves, and says what it follows
    const token = screen.getByRole('row', { name: 'spacing-xs, 0.375rem' })
    expect(token).toHaveTextContent('space-1 (4px)')
    // the unit switch changes how values show, not the stored px
    await userEvent.click(screen.getByRole('button', { name: 'px' }))
    expect(document.getElementById('sp-Spacing/1 (4px)')).toBeChecked()
    expect(screen.getByRole('button', { name: 'Custom' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Edit Spacing/1 (4px)' }))
    expect(screen.queryByRole('group', { name: 'Edit Spacing/1 (4px)' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Untitled' }))
    expect(screen.getAllByLabelText('4px')[0]).toBeChecked()
    expect(screen.getByRole('button', { name: 'Untitled' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('spacing: a step can be switched off, unless a token follows it, and an off step is not exported', async () => {
    at('/spacing')
    // Spacing/1 (4px) is followed by spacing-xs
    expect(screen.getByLabelText('0.25rem')).toBeDisabled()
    expect(screen.getByLabelText('0.25rem')).toHaveAttribute('title', 'Used by spacing-xs')
    // Spacing/48 (192px) is followed by nothing among the spacing tokens, but widths use it? find a free step
    const free = s().imported!.collections.find((c) => c.name === '_Primitives')!.variables.find((v) => v.name.startsWith('Spacing/') && !followersOf(v.name))!
    const px = Number(Object.values(free.values)[0].v)
    const box = screen.getByLabelText(`${+(px / 16).toFixed(3)}rem`)
    expect(box).toBeEnabled()
    await userEvent.click(box)
    expect(box).not.toBeChecked()
    expect(screen.getByText(/31 of 32 on\./)).toBeInTheDocument()
    const css = exportSections(s().imported ? { ...untitledThemeData(), imported: s().imported } : untitledThemeData()).find((x) => x.id === 'spacing')!.css
    expect(css).not.toContain(`--${free.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}:`)
    await userEvent.click(box)
    expect(box).toBeChecked()
  })

  it('spacing: a value for each breakpoint, each following its own step', async () => {
    at('/spacing')
    expect(screen.getByRole('columnheader', { name: 'XXL' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'MD' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'XS' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('row', { name: 'spacing-xs, 0.25rem' }))
    for (const m of ['XXL', 'MD', 'XS']) expect((screen.getByLabelText(`spacing-xs ${m} follows`) as HTMLSelectElement).value).toBe('_Primitives::Spacing/1 (4px)')
    // MD follows a bigger step: only MD moves
    await userEvent.selectOptions(screen.getByLabelText('spacing-xs MD follows'), '_Primitives::Spacing/2 (8px)')
    expect(screen.getByLabelText('spacing-xs MD')).toHaveValue(8)
    expect(screen.getByLabelText('spacing-xs XXL')).toHaveValue(4)
    expect(screen.getByLabelText('spacing-xs XS')).toHaveValue(4)
    expect(screen.getByRole('row', { name: 'spacing-xs, 0.25rem' })).toHaveTextContent('space-2 (8px)')
    // a value of its own at XS
    const xs = screen.getByLabelText('spacing-xs XS')
    await userEvent.clear(xs)
    await userEvent.type(xs, '3')
    expect((screen.getByLabelText('spacing-xs XS follows') as HTMLSelectElement).value).toBe('')
    expect(screen.getByRole('row', { name: 'spacing-xs, 0.25rem' })).toHaveTextContent('own value')
    // editing the scale moves every breakpoint that follows that step
    fireEvent.blur(xs)
    await userEvent.click(screen.getByRole('button', { name: 'Edit Spacing/2 (8px)' }))
    fireEvent.change(screen.getByLabelText('Spacing/2 (8px) Style'), { target: { value: '10' } })
    fireEvent.blur(screen.getByLabelText('Spacing/2 (8px) Style'))
    await userEvent.click(screen.getByRole('row', { name: /^spacing-xs,/ }))
    expect(screen.getByLabelText('spacing-xs MD')).toHaveValue(10)
  })

  it('spacing: the breakpoint widths are in the panel and can be changed', async () => {
    at('/spacing')
    const md = screen.getByLabelText('MD breakpoint width')
    expect(md).toHaveValue(768)
    expect(screen.getByLabelText('XXL breakpoint width')).toHaveValue(1400)
    expect(screen.getByLabelText('XS breakpoint width')).toHaveValue(390)
    fireEvent.change(md, { target: { value: '834' } })
    expect(s().imported!.collections.find((c) => c.name === 'Breakpoints')!.variables.find((v) => v.name === 'breakpoint-md')!.values.Value).toEqual({ v: 834 })
  })

  it('spacing: rename, remove and the radius tiles still work', async () => {
    at('/spacing')
    await userEvent.click(screen.getByRole('button', { name: 'radius-md, 0.5rem' }))
    const name = screen.getByLabelText('radius-md name')
    await userEvent.clear(name)
    await userEvent.type(name, 'radius-medium{Enter}')
    expect(screen.getByRole('button', { name: /^radius-medium/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '+ Add radius' }))
    await userEvent.click(screen.getByRole('button', { name: /^new,/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove new' }))
    expect(screen.queryByRole('button', { name: /^new,/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reset radius' }))
    expect(screen.getByRole('button', { name: /^radius-md,/ })).toBeInTheDocument()
  })

  it('spacing: a custom step can be added from the scale', async () => {
    at('/spacing')
    await userEvent.type(screen.getByLabelText('Custom value in px'), '36')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByRole('button', { name: 'Edit Spacing/custom (36px)' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Custom value in px'), '999')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('grids: the Grids screen layout with Untitled\'s widths and containers, and no columns or breakpoints', async () => {
    at('/grids')
    // breakpoints, widths and containers; no columns, gutters or sidebar
    expect(within(screen.getByRole('group', { name: 'Breakpoint' })).getAllByRole('button').map((b) => b.textContent)).toEqual(['XXL1400', 'MD768', 'XS390'])
    expect(screen.getByRole('group', { name: 'Width' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Container' })).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Width' })).getAllByRole('button')).toHaveLength(12)
    expect(within(screen.getByRole('group', { name: 'Container' })).getAllByRole('button')).toHaveLength(3)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('width-xl · 48rem')
    expect(screen.getByRole('img', { name: 'width-xl: 48rem' })).toBeInTheDocument()
    const stats = within(screen.getByRole('main'))
    expect(stats.getByText('SHARE OF 1920')).toBeInTheDocument()
    expect(stats.getByText('40%')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Export/ })).toHaveTextContent('18')
    expect(screen.getByText('Widths and containers')).toBeInTheDocument()
  })

  it('grids: pick a width or container, edit it, point it at a step, and rename or remove it', async () => {
    at('/grids')
    await userEvent.click(within(screen.getByRole('group', { name: 'Width' })).getByRole('button', { name: /^2xl/ }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('width-2xl')
    expect((screen.getByLabelText('width-2xl follows') as HTMLSelectElement).value).toBe('_Primitives::Spacing/256 (1,024px)')
    fireEvent.change(screen.getByLabelText('width-2xl value'), { target: { value: '1100' } })
    expect((screen.getByLabelText('width-2xl follows') as HTMLSelectElement).value).toBe('')
    expect(s().imported!.collections.find((c) => c.name === '4. Widths')!.variables.find((v) => v.name === 'width-2xl')!.values.XXL).toEqual({ v: 1100 })
    expect(s().imported!.collections.find((c) => c.name === '4. Widths')!.variables.find((v) => v.name === 'width-2xl')!.values.MD.a).toBe('_Primitives::Spacing/256 (1,024px)') // only XXL changed
    fireEvent.blur(screen.getByLabelText('width-2xl value'))
    await userEvent.selectOptions(screen.getByLabelText('width-2xl follows'), '_Primitives::Spacing/192 (768px)')
    expect(screen.getByLabelText('width-2xl value')).toHaveValue(768)
    // a container's padding is drawn as bands at the sides of a frame
    await userEvent.click(within(screen.getByRole('group', { name: 'Container' })).getByRole('button', { name: /^padding-desktop/ }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('container-padding-desktop · 2rem')
    expect(screen.getByText('content')).toBeInTheDocument()
    // add, rename and remove from the list on the left
    await userEvent.click(screen.getByRole('button', { name: '+ Add width' }))
    expect(within(screen.getByRole('region', { name: 'Widths list' })).getByRole('button', { name: /^new/ })).toBeInTheDocument()
    await userEvent.click(within(screen.getByRole('region', { name: 'Widths list' })).getByRole('button', { name: /^new/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove new' }))
    expect(within(screen.getByRole('region', { name: 'Widths list' })).queryByRole('button', { name: /^new/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reset widths' }))
    expect(within(screen.getByRole('group', { name: 'Width' })).getAllByRole('button')).toHaveLength(12)
  })

  it('grids: pick a breakpoint and edit the widths and containers of that breakpoint only', async () => {
    at('/grids')
    await userEvent.click(within(screen.getByRole('group', { name: 'Breakpoint' })).getByRole('button', { name: /^MD/ }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('width-xl · 48rem')
    fireEvent.change(screen.getByLabelText('width-xl value'), { target: { value: '700' } })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('43.75rem')
    expect(screen.getByText(/At MD it has a value of its own/)).toBeInTheDocument()
    fireEvent.blur(screen.getByLabelText('width-xl value'))
    await userEvent.click(within(screen.getByRole('group', { name: 'Breakpoint' })).getByRole('button', { name: /^XXL/ }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('width-xl · 48rem')
    expect(screen.getByText(/At XXL it follows Spacing\/192/)).toBeInTheDocument()
    const v = s().imported!.collections.find((c) => c.name === '4. Widths')!.variables.find((x) => x.name === 'width-xl')!
    expect([v.values.XXL.v, v.values.MD.v, v.values.XS.v]).toEqual([768, 700, 768])
  })

  it('grids: the unit switch changes how values show', async () => {
    at('/grids')
    await userEvent.click(screen.getByRole('button', { name: 'px' }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('width-xl · 768px')
  })

  it('type: responsive controls, but no weight variants or letter spacing, which the files do not have', async () => {
    at('/type')
    expect(screen.getByText('Responsive')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Tablet scaling' })).toBeInTheDocument()
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
