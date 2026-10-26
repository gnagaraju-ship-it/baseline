import { useEffect, useRef, useState } from 'react'
import { importedAccent } from '../lib/importedTokens'
import { MAX_THEMES, type Theme } from '../lib/themes'
import { useProject } from '../store/project'
import { Icon } from './Icon'

const item = 'flex w-full cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-2.5 py-2 text-left text-[13px] text-ink hover:bg-soft disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent'

const dot = (t: Theme) => (t.data.imported ? importedAccent(t.data.imported) : t.data.settings.text.primary)

/** Theme switcher + manager. `rail` is the icon button in the left rail; `chip` is the name chip in each settings panel header. */
export function ThemeMenu({ variant }: { variant: 'rail' | 'chip' }) {
  const project = useProject()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const active = project.themes.find((t) => t.id === project.activeThemeId) ?? project.themes[0]
  const full = project.themes.length >= MAX_THEMES
  const only = project.themes.length === 1

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc) }
  }, [open])

  const run = (fn: () => void) => () => { fn(); setOpen(false) }
  const rename = () => {
    const name = window.prompt('Theme name', active.name)
    if (name !== null) project.renameTheme(active.id, name)
  }
  const remove = () => {
    if (window.confirm(`Delete the theme "${active.name}"? Its colours, type, grid, spacing and elevation settings will be lost.`)) project.deleteTheme(active.id)
  }

  const trigger =
    variant === 'rail' ? (
      <button type="button" aria-label="Themes" aria-haspopup="menu" aria-expanded={open} title={`Theme: ${active.name}`} onClick={() => setOpen(!open)}
        className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-[10px] border border-line bg-surface text-ink">
        <Icon name="themes" />
        <span aria-hidden className="absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full border border-surface" style={{ background: dot(active) }} />
      </button>
    ) : (
      <button type="button" aria-label={`Theme: ${active.name}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}
        className="flex max-w-[140px] cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink">
        <span aria-hidden className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: dot(active) }} />
        <span className="truncate">{active.name}</span>
      </button>
    )

  return (
    <div ref={root} className="relative">
      {trigger}
      {open && (
        <div role="menu" aria-label="Themes" className={`absolute z-50 w-56 rounded-xl border border-line bg-surface p-1.5 shadow-lg ${variant === 'rail' ? 'left-14 top-0' : 'right-0 top-9'}`}>
          {project.themes.map((t) => (
            <button key={t.id} type="button" role="menuitemradio" aria-checked={t.id === active.id} className={item} onClick={run(() => project.switchTheme(t.id))}>
              <span aria-hidden className="h-3 w-3 flex-none rounded-full" style={{ background: dot(t) }} />
              <span className="flex-1 truncate">{t.name}</span>
              {t.data.imported && <span className="rounded bg-soft px-1.5 py-px text-[10px] text-muted">Imported</span>}
              {t.id === active.id && <span aria-hidden>✓</span>}
            </button>
          ))}
          <div className="my-1 h-px bg-line" />
          <button type="button" role="menuitem" className={item} disabled={full} title={full ? `Up to ${MAX_THEMES} themes` : undefined} onClick={run(() => project.createTheme())}>New theme</button>
          <button type="button" role="menuitem" className={item} disabled={full} onClick={run(() => project.duplicateTheme(active.id))}>Duplicate</button>
          <button type="button" role="menuitem" className={item} onClick={run(rename)}>Rename…</button>
          <button type="button" role="menuitem" className={item} disabled={only} onClick={run(remove)}>Delete</button>
        </div>
      )}
    </div>
  )
}
