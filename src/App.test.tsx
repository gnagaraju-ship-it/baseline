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

  it('downloads every module in one file from the rail on any screen', async () => {
    const { click, blobs } = stubDownload()
    at('/elevation')
    await userEvent.click(screen.getByRole('button', { name: 'Download all modules' }))
    expect(click).toHaveBeenCalled()
    const text = await blobs[0].text()
    for (const m of ['--primary-10:', '--bg-fill:', '--type-body-md-size', '--grid-xxl-width', '--space-24', '--elevation-md']) expect(text).toContain(m)
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
    expect(saved.version).toBe(1)
    expect(saved.state.settings.text.primary).toBe('#0EA5E9')
    expect(saved.state.grid.columns.xxl).toBe(10)
    expect(Object.keys(saved.state).sort()).toEqual(['contrast', 'elevation', 'grid', 'previewMode', 'settings', 'spacing', 'tokenOverrides', 'type', 'unit'])
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
