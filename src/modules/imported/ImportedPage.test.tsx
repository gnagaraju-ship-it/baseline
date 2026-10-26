import { act, render, screen, within } from '@testing-library/react'
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

describe('imported theme screens', () => {
  beforeEach(() => {
    s().reset()
    useProject.setState({ themes: [...s().themes, { id: 'theme-2', name: 'Untitled', data: untitledThemeData() }] })
    s().switchTheme('theme-2')
  })

  it('shows the imported palette instead of the generators', () => {
    at('/')
    expect(screen.getByText('Imported tokens')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '_Primitives' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Brand palette' })).toBeInTheDocument()
    expect(screen.queryByText('Add secondary')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Palette/ })).toHaveTextContent('322')
    expect(screen.getByRole('link', { name: /Tokens/ })).toHaveTextContent('273')
    const list = within(screen.getByRole('list', { name: 'Collections' }))
    expect(list.getAllByRole('listitem')).toHaveLength(8)
    expect(list.getByText('Brand palette').closest('li')).toHaveTextContent('11 · 10 modes')
  })

  it('shows Light and Dark columns for the semantic tokens', () => {
    at('/tokens')
    const region = screen.getByRole('region', { name: '1. Color modes' })
    expect(within(region).getByText('LIGHT MODE')).toBeInTheDocument()
    expect(within(region).getByText('DARK MODE')).toBeInTheDocument()
    expect(within(region).getByText('Colors/Background/bg-primary')).toBeInTheDocument()
  })

  it('shows type, widths, spacing and an empty elevation', () => {
    at('/type')
    expect(within(screen.getByRole('region', { name: '6. Typography' })).getByText('Font size/text-md')).toBeInTheDocument()
  })

  it('says when there is nothing, or the screen is not available', () => {
    at('/elevation')
    expect(screen.getByRole('status')).toHaveTextContent('no elevation tokens')
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
    expect(screen.getByRole('button', { name: /Export/ })).toBeInTheDocument()
    expect(screen.queryByText('Imported tokens')).not.toBeInTheDocument()
  })

  it('the contrast grid and UI preview are marked as not available', () => {
    at('/contrast')
    expect(screen.getByRole('status')).toHaveTextContent('Not available for an imported theme')
  })
})
