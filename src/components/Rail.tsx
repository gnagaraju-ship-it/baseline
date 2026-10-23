import { NavLink, useLocation } from 'react-router-dom'
import { downloadText } from '../lib/browser'
import { exportAll } from '../lib/exportAll'
import { useProject } from '../store/project'
import { Icon, type IconName } from './Icon'

const COLOUR_ROUTES = ['/', '/tokens', '/contrast']

const base = 'flex h-11 w-11 items-center justify-center rounded-[10px] border border-transparent text-muted no-underline hover:bg-soft'
const on = 'border-line bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,.05)]'

function RailLink({ to, label, icon, active }: { to: string; label: string; icon: IconName; active: boolean }) {
  return (
    <NavLink to={to} aria-label={label} aria-current={active ? 'page' : undefined} className={`${base} ${active ? on : ''}`}>
      <Icon name={icon} />
    </NavLink>
  )
}

function RailStub({ label, icon }: { label: string; icon: IconName }) {
  return (
    <button type="button" disabled aria-label={label} title={`${label} — not in v1`} className={`${base} bg-transparent opacity-60`}>
      <Icon name={icon} />
    </button>
  )
}

function RailButton({ label, icon, title, onClick }: { label: string; icon: IconName; title?: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title={title ?? label} onClick={onClick} className={`${base} cursor-pointer bg-transparent`}>
      <Icon name={icon} />
    </button>
  )
}

const Sep = () => <div className="my-1 h-px w-7 bg-line" />

export function Rail() {
  const { pathname } = useLocation()
  const project = useProject()

  function exportEverything() {
    const { css } = exportAll(project)
    downloadText('omni-tokens.css', css)
  }

  function resetProject() {
    if (window.confirm('Reset the whole project to its defaults? Your colours, type, grid, spacing and elevation settings will be lost.')) project.reset()
  }

  return (
    <nav aria-label="Workspace" className="flex w-16 flex-none flex-col items-center gap-1.5 border-r border-line-soft py-3.5">
      <div className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-[10px] bg-ink">
        <span className="h-3.5 w-3.5 rounded bg-[#FF5A1F]" />
      </div>
      <RailStub label="Projects" icon="folder" />
      <Sep />
      <RailLink to="/" label="Color" icon="color" active={COLOUR_ROUTES.includes(pathname)} />
      <RailLink to="/type" label="Typography" icon="type" active={pathname === '/type'} />
      <RailLink to="/grids" label="Grids" icon="grid" active={pathname === '/grids'} />
      <RailLink to="/spacing" label="Spacing" icon="spacing" active={pathname === '/spacing'} />
      <RailLink to="/elevation" label="Elevation" icon="elevation" active={pathname === '/elevation'} />
      <Sep />
      <RailLink to="/preview" label="UI preview" icon="monitor" active={pathname === '/preview'} />
      <RailStub label="Documentation" icon="docs" />
      <div className="flex-1" />
      <RailButton label="Download all modules" icon="download" title={`Export all modules — ${exportAll(project).count} tokens in one CSS file`} onClick={exportEverything} />
      <RailButton label="Reset project" icon="reset" onClick={resetProject} />
      <RailStub label="Toggle dark mode" icon="moon" />
    </nav>
  )
}
