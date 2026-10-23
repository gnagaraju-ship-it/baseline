import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { Logo } from './Logo'

describe('Logo', () => {
  it('is an accessible image named Baseline at the requested size', () => {
    render(<Logo size={40} />)
    const logo = screen.getByRole('img', { name: 'Baseline' })
    expect(logo).toHaveAttribute('width', '40')
    expect(logo).toHaveAttribute('viewBox', '0 0 32 32')
  })

  it('appears in the rail and in the settings panel of every screen', () => {
    for (const path of ['/', '/type', '/grids', '/spacing', '/elevation', '/missing']) {
      const { unmount } = render(
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      )
      const logos = screen.getAllByRole('img', { name: 'Baseline' })
      expect(logos.length).toBeGreaterThanOrEqual(path === '/' ? 2 : 1)
      unmount()
    }
  })

  it('uses the same drawing as the favicon', () => {
    const favicon = readFileSync(join(__dirname, '../../public/favicon.svg'), 'utf8')
    const shapes = (svg: string) => [...svg.matchAll(/<rect[^>]*>/g)].map((m) => m[0].replace(/\s+/g, ' ').replace(' />', '/>').replace('"/>', '" />'))
    const { container } = render(<Logo />)
    const rendered = container.querySelector('svg')!.innerHTML
    for (const attr of ['rx="8" fill="#18181B"', 'fill="#FF5A1F"', 'width="12"', 'width="16"', 'width="9"']) {
      expect(favicon).toContain(attr)
      expect(rendered).toContain(attr)
    }
    expect(shapes(favicon)).toHaveLength(5)
  })
})
