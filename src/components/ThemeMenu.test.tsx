import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Rail } from './Rail'
import { ThemeMenu } from './ThemeMenu'
import { useProject } from '../store/project'

const s = () => useProject.getState()

describe('ThemeMenu', () => {
  beforeEach(() => s().reset())

  it('is in the rail above the modules', () => {
    render(<MemoryRouter><Rail /></MemoryRouter>)
    const nav = screen.getByRole('navigation', { name: 'Workspace' })
    const all = within(nav).getAllByRole('button', { hidden: false })
    const themes = within(nav).getByRole('button', { name: 'Themes' })
    expect(all.indexOf(themes)).toBeLessThan(all.indexOf(within(nav).getAllByRole('button', { name: /export/i })[0]))
    expect(themes.compareDocumentPosition(within(nav).getByRole('link', { name: 'Color' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('creates, switches, renames, duplicates and deletes themes', async () => {
    render(<ThemeMenu variant="chip" />)
    await userEvent.click(screen.getByRole('button', { name: 'Theme: Default' }))
    expect(screen.getByRole('menuitemradio', { name: 'Default' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeDisabled()

    await userEvent.click(screen.getByRole('menuitem', { name: 'New theme' }))
    expect(s().themes).toHaveLength(2)
    expect(screen.queryByRole('menu')).toBeNull()
    expect(s().activeThemeId).toBe(s().themes[1].id)

    vi.spyOn(window, 'prompt').mockReturnValue('Ocean')
    await userEvent.click(screen.getByRole('button', { name: /^Theme:/ }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Rename…' }))
    expect(s().themes[1].name).toBe('Ocean')

    await userEvent.click(screen.getByRole('button', { name: 'Theme: Ocean' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }))
    expect(s().themes.map((t) => t.name)).toEqual(['Default', 'Ocean', 'Ocean copy'])

    await userEvent.click(screen.getByRole('button', { name: 'Theme: Ocean copy' }))
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Default' }))
    expect(s().activeThemeId).toBe(s().themes[0].id)

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await userEvent.click(screen.getByRole('button', { name: 'Theme: Default' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
    expect(s().themes).toHaveLength(3)
    confirm.mockReturnValue(true)
    await userEvent.click(screen.getByRole('button', { name: 'Theme: Default' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
    expect(s().themes.map((t) => t.name)).toEqual(['Ocean', 'Ocean copy'])
  })

  it('closes on Escape and disables adding at the maximum', async () => {
    for (let i = 0; i < 8; i++) s().createTheme()
    render(<ThemeMenu variant="rail" />)
    await userEvent.click(screen.getByRole('button', { name: 'Themes' }))
    expect(screen.getByRole('menuitem', { name: 'New theme' })).toBeDisabled()
    expect(screen.getByRole('menuitem', { name: 'Duplicate' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).toBeNull()
  })
})
