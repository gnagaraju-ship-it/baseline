import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { titleFor } from './lib/titles'
import { useProject } from './store/project'

function at(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  )
}

function stubDownload() {
  const click = vi.fn()
  const blobs: Blob[] = []
  Object.assign(URL, { createObjectURL: vi.fn((b: Blob) => (blobs.push(b), 'blob:x')), revokeObjectURL: vi.fn() })
  HTMLAnchorElement.prototype.click = click
  return { click, blobs }
}

describe('app shell', () => {
  beforeEach(() => {
    useProject.getState().reset()
  })

  it('sets the browser tab title per route', () => {
    at('/grids')
    expect(document.title).toBe('Grids · Omni by Canvs')
    expect(titleFor('/')).toBe('Palette · Omni by Canvs')
    expect(titleFor('/nope')).toBe('Page not found · Omni by Canvs')
  })

  it('shows a not-found page with a way back', () => {
    at('/nope')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Palette' })).toHaveAttribute('href', '/')
  })

  it('marks only UI preview active on /preview and Color on colour routes', () => {
    at('/preview')
    const rail = within(screen.getByRole('navigation', { name: 'Workspace' }))
    expect(rail.getByRole('link', { name: 'UI preview' })).toHaveAttribute('aria-current', 'page')
    expect(rail.getByRole('link', { name: 'Color' })).not.toHaveAttribute('aria-current')
  })

  it('opens export settings from the rail with every module selected', async () => {
    at('/elevation')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'All modules export settings' }))
    const dialog = screen.getByRole('dialog', { name: 'Export settings' })
    expect(within(dialog).getAllByRole('checkbox').filter((c) => (c as HTMLInputElement).checked)).toHaveLength(6)
    expect(within(dialog).getByRole('radio', { name: /CSS variables/ })).toBeChecked()
    expect(within(dialog).getByText(/206 tokens/)).toBeInTheDocument()
  })

  it('the Export button on a screen opens the dialog with that screen\'s modules only', async () => {
    at('/grids')
    await userEvent.click(screen.getByRole('button', { name: /^Export/ }))
    const dialog = screen.getByRole('dialog', { name: 'Export settings' })
    const on = within(dialog).getAllByRole('checkbox').filter((c) => (c as HTMLInputElement).checked)
    expect(on).toHaveLength(1)
    expect(within(dialog).getByRole('checkbox', { name: /Grids/ })).toBeChecked()
    expect(within(dialog).getByLabelText('Export preview')).toHaveTextContent('--grid-xxl-width: 1400px;')
    expect(within(dialog).getByLabelText('Export preview')).not.toHaveTextContent('--primary-10')
  })

  it('Tokens opens with semantic tokens and the ramps they need locked on', async () => {
    at('/tokens')
    await userEvent.click(screen.getByRole('button', { name: /^Export/ }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('checkbox', { name: /Colour ramps/ })).toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: /Colour ramps/ })).toBeDisabled()
    expect(within(dialog).getByText('Needed by semantic tokens')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /Semantic tokens/ }))
    expect(within(dialog).getByRole('checkbox', { name: /Colour ramps/ })).toBeEnabled()
  })

  it('changes the preview and file name with the format and the modules, then downloads', async () => {
    const { click, blobs } = stubDownload()
    at('/')
    await userEvent.click(screen.getByRole('button', { name: 'All modules export settings' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'None' }))
    expect(within(dialog).getByText('Nothing selected')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Download/ })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: /^Copy/ })).toBeDisabled()
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /Spacing/ }))
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /Elevation/ }))
    await userEvent.click(within(dialog).getByRole('radio', { name: /Design tokens JSON/ }))
    expect(within(dialog).getByText(/omni-tokens\.json/, { selector: 'span' })).toBeInTheDocument()
    expect(within(dialog).getByText(/22 tokens/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: /Download/ }))
    expect(click).toHaveBeenCalledTimes(1)
    expect(blobs[0].type).toBe('application/json')
    const doc = JSON.parse(await blobs[0].text())
    expect(Object.keys(doc).filter((k) => !k.startsWith('$'))).toEqual(['Spacing', 'Elevation'])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('offers a Figma plugin script that creates variables, with steps for running it', async () => {
    const { click, blobs } = stubDownload()
    at('/')
    await userEvent.click(screen.getByRole('button', { name: 'All modules export settings' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).queryByRole('list', { name: 'How to import into Figma' })).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('radio', { name: /Figma Variables/ }))
    expect(within(dialog).getByRole('list', { name: 'How to import into Figma' })).toHaveTextContent('code.js')
    expect(within(dialog).getAllByText(/omni-figma-variables\.js/).length).toBeGreaterThan(0)
    expect(within(dialog).getByLabelText('Export preview')).toHaveTextContent('creates your tokens as Figma Variables')
    await userEvent.click(within(dialog).getByRole('button', { name: /Download/ }))
    expect(click).toHaveBeenCalledTimes(1)
    expect(blobs[0].type).toBe('text/javascript')
    const script = await blobs[0].text()
    expect(script).toContain('createVariableCollection')
    expect(script).toContain('"com.figma"')
    expect(script).toContain('#9D00D6')
  })

  it('downloads the full CSS file with everything selected', async () => {
    const { click, blobs } = stubDownload()
    at('/type')
    await userEvent.click(screen.getByRole('button', { name: 'All modules export settings' }))
    await userEvent.click(screen.getByRole('button', { name: /Download/ }))
    expect(click).toHaveBeenCalled()
    const text = await blobs[0].text()
    for (const m of ['--primary-10:', '--bg-fill:', '--type-body-md-size', '--grid-xxl-width', '--space-24', '--elevation-md']) expect(text).toContain(m)
  })

  it('copies from the dialog, and shows a long file as a short preview', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: write }, configurable: true })
    at('/')
    await userEvent.click(screen.getByRole('button', { name: 'All modules export settings' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText('Export preview').textContent).toMatch(/more lines in the file/)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Copy' }))
    expect(write.mock.calls[0][0]).toContain('--elevation-md:')
    expect(write.mock.calls[0][0].split('\n').length).toBeGreaterThan(48)
    expect(await within(dialog).findByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('closes with Escape, Cancel, the close button and the backdrop, and gives focus back', async () => {
    at('/')
    const opener = screen.getByRole('button', { name: 'All modules export settings' })
    let n = 0
    for (const close of [
      () => userEvent.keyboard('{Escape}'),
      () => userEvent.click(screen.getByRole('button', { name: 'Cancel' })),
      () => userEvent.click(screen.getByRole('button', { name: 'Close export settings' })),
      () => userEvent.click(screen.getByRole('dialog').parentElement!)
    ]) {
      await userEvent.click(opener)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      await close()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(opener, `after closer ${n}`).toHaveFocus()
      n += 1
    }
  })

  it('keeps Tab inside the dialog', async () => {
    at('/')
    await userEvent.click(screen.getByRole('button', { name: 'All modules export settings' }))
    const dialog = screen.getByRole('dialog')
    for (let i = 0; i < 30; i++) {
      await userEvent.tab()
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
    for (let i = 0; i < 5; i++) {
      await userEvent.tab({ shift: true })
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
  })

  it('resets the whole project after confirmation, and not when cancelled', async () => {
    at('/')
    useProject.getState().setUnit('pt')
    useProject.getState().setText('primary', '#0EA5E9')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await userEvent.click(screen.getByRole('button', { name: 'Reset project' }))
    expect(useProject.getState().unit).toBe('pt')
    confirm.mockReturnValue(true)
    await userEvent.click(screen.getByRole('button', { name: 'Reset project' }))
    expect(useProject.getState().unit).toBe('rem')
    expect(useProject.getState().settings.text.primary).toBe('#9d00d6')
    confirm.mockRestore()
  })

  it('has Copy all on every foundations screen and reports a failed copy', async () => {
    for (const path of ['/type', '/grids', '/spacing']) {
      const { unmount } = at(path)
      expect(screen.getByRole('button', { name: 'Copy all' })).toBeInTheDocument()
      unmount()
    }
    const write = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: write }, configurable: true })
    at('/grids')
    await userEvent.click(screen.getByRole('button', { name: 'Copy all' }))
    expect(write.mock.calls[0][0]).toContain('--grid-xxl-columns: 12;')
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('says so when the clipboard refuses', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) }, configurable: true })
    at('/spacing')
    await userEvent.click(screen.getByRole('button', { name: 'Copy all' }))
    expect(await screen.findByRole('button', { name: 'Copy failed' })).toBeInTheDocument()
  })

  it('UI preview uses the fonts chosen in Type', () => {
    useProject.getState().setTypeFont('headingFont', 'Playfair Display')
    useProject.getState().setTypeFont('bodyFont', 'Lora')
    at('/preview')
    expect(screen.getByText('Fonts: Playfair Display, Lora')).toBeInTheDocument()
    expect(screen.getByTestId('preview-canvas').style.getPropertyValue('--preview-heading')).toContain('Playfair Display')
    expect(screen.getByTestId('preview-canvas').style.getPropertyValue('--preview-body')).toContain('Lora')
  })
})

describe('persistence', () => {
  it('saves project data, and only data, to localStorage', () => {
    useProject.getState().reset()
    useProject.getState().setText('primary', '#0EA5E9')
    useProject.getState().setGridColumns(10)
    const saved = JSON.parse(localStorage.getItem('omni-project')!)
    expect(saved.version).toBe(2)
    expect(saved.state.settings.text.primary).toBe('#0EA5E9')
    expect(saved.state.grid.columns.xxl).toBe(10)
    expect(Object.keys(saved.state).sort()).toEqual(['appTheme', 'contrast', 'elevation', 'grid', 'previewMode', 'settings', 'spacing', 'tokenAlpha', 'tokenOverrides', 'type', 'unit'])
    expect(JSON.stringify(saved)).not.toContain('copied')
  })

  it('restores saved data on rehydrate and reset clears it', async () => {
    useProject.getState().reset()
    localStorage.setItem('omni-project', JSON.stringify({ version: 1, state: { unit: 'px', settings: { ...useProject.getState().settings, secondary: '4852E5' } } }))
    await useProject.persist.rehydrate()
    expect(useProject.getState().unit).toBe('px')
    expect(useProject.getState().settings.secondary).toBe('4852E5')
    expect(useProject.getState().grid.columns.xxl).toBe(12)
    useProject.getState().reset()
    expect(JSON.parse(localStorage.getItem('omni-project')!).state.unit).toBe('rem')
  })
})
