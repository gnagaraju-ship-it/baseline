import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ColourField } from '../../components/ColourField'
import { Icon } from '../../components/Icon'
import { Logo } from '../../components/Logo'
import { norm } from '../../lib/colour'
import { FONT_CATALOG } from '../../lib/fonts'
import { RATIOS } from '../../lib/typeScale'
import { NumberField } from '../../components/NumberField'
import { startHex } from '../recipes'
import { activeResolved, useV2, v2Systems } from '../store'
import { V2ExportDialog } from './V2ExportDialog'

const GROUPS: Array<{ key: string; title: string }> = [
  { key: 'brand', title: 'Brand' },
  { key: 'neutral', title: 'Neutral' },
  { key: 'status', title: 'Status' },
  { key: 'other', title: 'Other colours' }
]

const seg = (on: boolean) => `h-8 flex-1 rounded-lg border px-3 text-[13px] font-medium ${on ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface text-ink-3'}`
const h3 = 'm-0 text-xs font-semibold uppercase tracking-[.08em] text-muted'

function ThemeBar() {
  const s = useV2()
  const list = s.themes[s.activeSystemId] ?? []
  const active = s.activeThemeId[s.activeSystemId]
  const current = list.find((t) => t.id === active) ?? list[0]
  return (
    <section className="flex flex-col gap-2">
      <h3 className={h3}>Theme</h3>
      <div className="flex gap-1.5">
        <select aria-label="Theme" value={current.id} onChange={(e) => s.setTheme(e.target.value)} className="inp h-9 min-w-0 flex-1">
          {list.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button type="button" onClick={() => s.addTheme()} disabled={list.length >= 8} className="h-9 rounded-lg border border-line bg-surface px-3 text-[13px] disabled:opacity-50">New</button>
      </div>
      <div className="flex gap-1.5">
        <button type="button" onClick={() => { const n = window.prompt('Theme name', current.name); if (n !== null) s.renameTheme(current.id, n) }} className="h-8 rounded-lg border border-line bg-surface px-3 text-xs">Rename</button>
        <button type="button" disabled={list.length < 2} onClick={() => { if (window.confirm(`Delete the theme "${current.name}"?`)) s.deleteTheme(current.id) }} className="h-8 rounded-lg border border-line bg-surface px-3 text-xs disabled:opacity-50">Delete</button>
        <button type="button" onClick={s.resetTheme} className="h-8 rounded-lg border border-line bg-surface px-3 text-xs">Reset theme</button>
      </div>
    </section>
  )
}

/** A font name field that keeps what is typed, and commits every non-empty value. */
function FontField({ id, label, value, start, onCommit }: { id: string; label: string; value: string; start: string; onCommit: (v: string | undefined) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium">{label}</label>
      <input
        id={id}
        list="v2-fonts"
        value={draft ?? value}
        onChange={(e) => { setDraft(e.target.value); if (e.target.value.trim()) onCommit(e.target.value === start ? undefined : e.target.value) }}
        onBlur={() => setDraft(null)}
        className="inp h-9 w-full"
      />
    </div>
  )
}

function TypeControls() {
  const s = useV2()
  const r = useMemo(() => activeResolved(s), [s.themes, s.activeSystemId, s.activeThemeId]) // eslint-disable-line react-hooks/exhaustive-deps
  const setup = r.system.type
  if (!setup) return null
  const t = r.theme.type ?? {}
  const fixed = setup.kind === 'fixed'
  return (
    <section aria-label="Type" className="flex flex-col gap-3">
      <h3 className={h3}>Type</h3>
      <datalist id="v2-fonts">{FONT_CATALOG.map((f) => <option key={f.name} value={f.name} />)}</datalist>
      {([['headingFont', 'Heading font', setup.headingFont], ['bodyFont', 'Body font', setup.bodyFont]] as const).map(([key, label, start]) => (
        <FontField key={key} id={`v2-${key}`} label={label} value={t[key] ?? start} start={start} onCommit={(v) => s.setType({ [key]: v })} />
      ))}
      {fixed ? (
        <p className="m-0 text-xs leading-[1.55] text-muted">Sizes are written down for each step. Change them on the Type screen.</p>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <label htmlFor="v2-base" className="flex-1 text-[13px] font-medium">Base size</label>
            <NumberField id="v2-base" value={t.base ?? setup.base} min={10} max={24} className="h-9 w-[76px] px-1.5 text-right" onCommit={(n) => n !== null && n >= 10 && n <= 24 && s.setType({ base: n === setup.base ? undefined : n })} />
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="v2-ratio" className="flex-1 text-[13px] font-medium">Scale ratio</label>
            <select id="v2-ratio" value={String(t.ratio ?? setup.ratio)} onChange={(e) => s.setType({ ratio: parseFloat(e.target.value) === setup.ratio ? undefined : parseFloat(e.target.value) })} className="inp h-9 w-[190px] font-mono">
              {RATIOS.map(([name, v]) => <option key={name} value={String(v)}>{name} {v}</option>)}
            </select>
          </div>
          <div role="group" aria-label="Line grid" className="flex items-center gap-1.5">
            <span className="flex-1 text-[13px] font-medium">Line grid</span>
            {[4, 8].map((g) => <button key={g} type="button" aria-pressed={(t.grid ?? setup.grid) === g} onClick={() => s.setType({ grid: g === setup.grid ? undefined : g })} className={`h-8 rounded-full border px-3 text-xs ${(t.grid ?? setup.grid) === g ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface text-ink-3'}`}>{g}px</button>)}
          </div>
        </>
      )}
    </section>
  )
}

function Panel() {
  const s = useV2()
  const r = useMemo(() => activeResolved(s), [s.themes, s.activeSystemId, s.activeThemeId]) // eslint-disable-line react-hooks/exhaustive-deps
  const systems = v2Systems()
  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <Logo size={32} />
        <div className="flex-1 text-base font-semibold">Baseline v2</div>
        <Link to="/" className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-ink-3 no-underline">Back to v1</Link>
      </div>
      <div className="flex flex-col gap-6 p-5">
        <section className="flex flex-col gap-2">
          <h3 className={h3}>Design system</h3>
          <div role="group" aria-label="Design system" className="flex gap-1.5">
            {systems.map((x) => <button key={x.id} type="button" aria-pressed={s.activeSystemId === x.id} onClick={() => s.setSystem(x.id)} className={seg(s.activeSystemId === x.id)}>{x.name}</button>)}
          </div>
        </section>
        <ThemeBar />
        <TypeControls />
        {GROUPS.map((g) => {
          const recipes = r.system.recipes.filter((x) => x.group === g.key)
          if (!recipes.length) return null
          return (
            <section key={g.key} aria-label={g.title} className="flex flex-col gap-3">
              <h3 className={h3}>{g.title}</h3>
              {recipes.map((x) => (
                <ColourField
                  key={x.id}
                  id={`f-${x.id}`}
                  label={x.name}
                  value={r.theme.ramps[x.id] ?? `#${startHex(x)}`}
                  fallback={startHex(x)}
                  invalidMessage="Enter six hex digits."
                  onChange={(v) => s.setRamp(x.id, norm(v) === `${startHex(x)}` ? '' : v)}
                />
              ))}
            </section>
          )
        })}
      </div>
    </>
  )
}

/** Frame of the v2 screens: the settings panel, the two screens as tabs, and Export. */
export function V2Shell({ children }: { children: ReactNode }) {
  const openExport = useV2((s) => s.openExport)
  const systemName = useV2((s) => v2Systems().find((x) => x.id === s.activeSystemId)?.name ?? '')
  useEffect(() => { document.title = `${systemName} · Baseline v2` }, [systemName])
  const tab = ({ isActive }: { isActive: boolean }) => `flex h-16 items-center px-3.5 no-underline ${isActive ? 'font-semibold text-ink shadow-[inset_0_-2px_0_#E2531B]' : 'font-medium text-muted hover:text-ink'}`
  return (
    <div className="flex min-h-screen flex-wrap bg-ground text-sm text-ink">
      <aside aria-label="Settings" className="flex max-w-full flex-[1_1_340px] flex-col border-r border-line-soft bg-panel md:max-w-[360px]">
        <Panel />
      </aside>
      <main className="flex min-w-0 flex-[999_1_560px] flex-col bg-ground">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-line-soft pl-7 pr-6">
          <nav aria-label="Views" className="flex">
            <NavLink to="/v2" end className={tab}>Palette</NavLink>
            <NavLink to="/v2/tokens" className={tab}>Tokens</NavLink>
            <NavLink to="/v2/type" className={tab}>Type</NavLink>
          </nav>
          <button type="button" onClick={openExport} className="flex h-10 items-center gap-2 rounded-[9px] border-0 bg-btn px-3.5 text-[13px] font-semibold text-white">
            <Icon name="export" size={15} strokeWidth={1.8} />
            Export
          </button>
        </div>
        {children}
      </main>
      <V2ExportDialog />
    </div>
  )
}
