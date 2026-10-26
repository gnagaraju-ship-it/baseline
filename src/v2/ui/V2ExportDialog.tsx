import { useEffect, useMemo, useState } from 'react'
import { copyText, downloadText } from '../../lib/browser'
import { ELEVATION } from '../export/css'
import { resolveThemes, themesCss, themesJson } from '../export/themes'
import { activeResolved, useV2 } from '../store'

const PREVIEW = 40

/** Export of the active system and theme: CSS or the JSON the Figma plugin imports, for the chosen collections. */
export function V2ExportDialog() {
  const s = useV2()
  const [format, setFormat] = useState<'css' | 'json'>('css')
  const [off, setOff] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [scope, setScope] = useState<'all' | 'active'>('all')
  const r = useMemo(() => activeResolved(s), [s.themes, s.activeSystemId, s.activeThemeId]) // eslint-disable-line react-hooks/exhaustive-deps
  const several = r.system.themes.length > 1
  const all = several && scope === 'all'
  const rs = useMemo(() => (all ? resolveThemes(r.system) : [r]), [all, r])
  const names = [...r.collections.map((c) => c.name), ...(r.elevation ? [ELEVATION] : [])]
  const chosen = names.filter((n) => !off.includes(n))
  const built = useMemo(() => (s.exportOpen && chosen.length ? (format === 'css' ? themesCss(rs, chosen) : { css: themesJson(rs, chosen), count: r.collections.filter((c) => chosen.includes(c.name)).reduce((n, c) => n + c.variables.length, 0) + (r.elevation && chosen.includes(ELEVATION) ? r.elevation.tokens.length : 0) }) : { css: '', count: 0 }), [s.exportOpen, format, rs, chosen.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!s.exportOpen) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') s.closeExport() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [s.exportOpen]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!s.exportOpen) return null
  const file = `${r.system.id}-${all ? 'themes' : r.theme.id}.${format === 'css' ? 'css' : 'json'}`
  const lines = built.css.split('\n')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && s.closeExport()}>
      <div role="dialog" aria-modal="true" aria-labelledby="v2-export-title" className="flex max-h-[92vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border border-line bg-surface">
        <header className="flex items-center gap-3 border-b border-line px-6 py-4">
          <h2 id="v2-export-title" className="m-0 flex-1 text-lg font-semibold">Export {r.system.name}{all ? `, ${r.system.themes.length} themes` : `, ${r.theme.name}`}</h2>
          <button type="button" aria-label="Close export" onClick={s.closeExport} className="h-9 rounded-lg border-0 bg-soft px-3 text-xs">Close</button>
        </header>
        <div className="flex flex-col gap-4 overflow-y-auto p-6">
          <fieldset className="m-0 flex gap-2 border-0 p-0">
            <legend className="sr-only">Format</legend>
            {([['css', 'CSS variables'], ['json', 'Design tokens JSON (Figma plugin)']] as const).map(([k, label]) => (
              <label key={k} className={`flex cursor-pointer items-center gap-2 rounded-[10px] border px-3 py-2 text-[13px] ${format === k ? 'border-accent-ring bg-accent-wash' : 'border-line'}`}>
                <input type="radio" name="v2-format" checked={format === k} onChange={() => setFormat(k)} className="accent-accent" />{label}
              </label>
            ))}
          </fieldset>
          {several && (
            <fieldset className="m-0 flex gap-2 border-0 p-0">
              <legend className="sr-only">Themes</legend>
              {([['all', `All themes in one file (${r.system.themes.length})`], ['active', `Only ${r.theme.name}`]] as const).map(([k, label]) => (
                <label key={k} className={`flex cursor-pointer items-center gap-2 rounded-[10px] border px-3 py-2 text-[13px] ${scope === k ? 'border-accent-ring bg-accent-wash' : 'border-line'}`}>
                  <input type="radio" name="v2-themes" checked={scope === k} onChange={() => setScope(k)} className="accent-accent" />{label}
                </label>
              ))}
            </fieldset>
          )}
          <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-[.08em] text-muted">Include</legend>
            {[...r.collections.map((c) => ({ name: c.name, count: c.variables.length })), ...(r.elevation ? [{ name: ELEVATION, count: r.elevation.tokens.length }] : [])].map((c) => (
              <label key={c.name} className="flex items-center gap-2.5 text-[13px]">
                <input type="checkbox" checked={!off.includes(c.name)} onChange={() => setOff((o) => (o.includes(c.name) ? o.filter((x) => x !== c.name) : [...o, c.name]))} className="accent-accent" />
                <span className="flex-1 font-mono">{c.name}</span>
                <span className="rounded-md bg-soft px-1.5 py-px font-mono text-[11px] text-muted">{c.count}</span>
              </label>
            ))}
          </fieldset>
          {chosen.length ? (
            <pre aria-label="Export preview" className="m-0 max-h-[320px] overflow-auto whitespace-pre rounded-[10px] bg-night p-4 font-mono text-xs leading-[1.65] text-code">{lines.slice(0, PREVIEW).join('\n')}{lines.length > PREVIEW ? `\n… ${lines.length - PREVIEW} more lines in the file` : ''}</pre>
          ) : <p role="status" className="m-0 text-[13px] text-muted">Choose at least one collection.</p>}
        </div>
        <footer className="flex flex-wrap items-center gap-3 border-t border-line px-6 py-4">
          <p role="status" className="m-0 flex-1 text-[13px] text-muted">{chosen.length ? `${built.count} tokens${all ? ` × ${r.system.themes.length} themes` : ''} · ${file}` : 'Nothing selected'}</p>
          <button type="button" disabled={!chosen.length} onClick={async () => { setCopied(await copyText(built.css)); setTimeout(() => setCopied(false), 1500) }} className="h-10 rounded-[9px] border border-line bg-surface px-4 text-[13px] disabled:opacity-50">{copied ? 'Copied' : 'Copy'}</button>
          <button type="button" disabled={!chosen.length} onClick={() => { downloadText(file, built.css, format === 'css' ? 'text/css' : 'application/json'); s.closeExport() }} className="h-10 rounded-[9px] border-0 bg-btn px-4 text-[13px] font-semibold text-white disabled:opacity-50">Download</button>
        </footer>
      </div>
    </div>
  )
}
