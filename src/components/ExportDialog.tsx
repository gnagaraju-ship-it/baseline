import { useEffect, useMemo, useRef } from 'react'
import { copyText, downloadText } from '../lib/browser'
import { exportSections } from '../lib/exportAll'
import { EXPORT_MODULES, FORMATS, buildExport, normaliseSelection, ALL_MODULES } from '../lib/exportBuilder'
import { useProject } from '../store/project'
import { Icon } from './Icon'

const PREVIEW_LINES = 48

/** Export settings: pick the format and which modules go in the file, check the result, then download or copy. */
export function ExportDialog() {
  const project = useProject()
  const { exportDialog: d, closeExport, setExportFormat, toggleExportModule, setExportModules, flashCopied, copied, copyFailed } = project
  const box = useRef<HTMLDivElement>(null)
  const opener = useRef<Element | null>(null)
  /** True when the mouse went down on the backdrop itself, so a drag that ends there does not close the dialog. */
  const downOnBackdrop = useRef(false)

  const input = {
    settings: project.settings, tokenOverrides: project.tokenOverrides, tokenAlpha: project.tokenAlpha, type: project.type,
    grid: project.grid, spacing: project.spacing, elevation: project.elevation
  }
  const sections = useMemo(() => (d.open ? exportSections(input) : []), [d.open, project.settings, project.tokenOverrides, project.tokenAlpha, project.type, project.grid, project.spacing, project.elevation]) // eslint-disable-line react-hooks/exhaustive-deps
  const built = useMemo(() => (d.open ? buildExport(input, d.format, d.modules) : null), [d.open, d.format, d.modules, project.settings, project.tokenOverrides, project.tokenAlpha, project.type, project.grid, project.spacing, project.elevation]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!d.open) return
    opener.current = document.activeElement
    box.current?.querySelector<HTMLElement>('input, button')?.focus()
    return () => (opener.current as HTMLElement | null)?.focus?.()
  }, [d.open])

  if (!d.open || !built) return null

  const chosen = normaliseSelection(d.modules)
  const preview = built.text.split('\n').slice(0, PREVIEW_LINES).join('\n')
  const hidden = Math.max(0, built.lines - PREVIEW_LINES)
  const empty = chosen.length === 0

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      closeExport()
      return
    }
    if (e.key !== 'Tab' || !box.current) return
    const items = [...box.current.querySelectorAll<HTMLElement>('input:not([disabled]), button:not([disabled])')]
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => { downOnBackdrop.current = e.target === e.currentTarget }} onClick={(e) => e.target === e.currentTarget && downOnBackdrop.current && closeExport()}>
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
        onKeyDown={onKeyDown}
        className="flex max-h-[92vh] w-full max-w-[860px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_64px_rgba(0,0,0,.35)]"
      >
        <header className="flex items-center gap-3 border-b border-line px-6 py-4">
          <h2 id="export-title" className="m-0 flex-1 text-lg font-semibold tracking-[-0.01em]">Export settings</h2>
          <button type="button" aria-label="Close export settings" onClick={closeExport} className="flex h-9 w-9 items-center justify-center rounded-lg border-0 bg-soft text-ink-3">
            <Icon name="close" size={15} strokeWidth={2} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[320px_minmax(0,1fr)]">
          <div className="flex flex-col gap-6 border-line p-6 md:border-r">
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="mb-2 p-0 text-xs font-semibold uppercase tracking-[.08em] text-muted">Format</legend>
              {FORMATS.map((f) => (
                <label key={f.id} className={`flex cursor-pointer items-start gap-2.5 rounded-[10px] border p-3 ${d.format === f.id ? 'border-accent-ring bg-accent-wash' : 'border-line'}`}>
                  <input type="radio" name="export-format" checked={d.format === f.id} onChange={() => setExportFormat(f.id)} className="mt-0.5 h-4 w-4 accent-accent" />
                  <span className="flex flex-col"><span className="text-[13px] font-semibold">{f.label}</span><span className="text-xs text-muted">{f.note}</span></span>
                </label>
              ))}
              {d.format === 'figma' && (
                <ol aria-label="How to import into Figma" className="m-0 flex list-decimal flex-col gap-1 rounded-[10px] bg-soft py-3 pl-8 pr-3 text-xs leading-[1.5] text-ink-3">
                  <li>Download the script.</li>
                  <li>In the Figma desktop app: Plugins, Development, New plugin, choose Empty and a folder.</li>
                  <li>Open that folder&rsquo;s <code className="font-mono">code.js</code>, replace its contents with the script, save.</li>
                  <li>Plugins, Development, run your plugin. Variables and shadow styles appear in the file.</li>
                  <li className="list-none -ml-4 text-muted">Or paste it into the free Scripter plugin and press Run. Running it again updates in place.</li>
                </ol>
              )}
            </fieldset>

            <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
              <legend className="mb-2 flex w-full items-center justify-between p-0 text-xs font-semibold uppercase tracking-[.08em] text-muted">
                Include
                <span className="flex gap-2 normal-case tracking-normal">
                  <button type="button" onClick={() => setExportModules(ALL_MODULES)} className="border-0 bg-transparent p-0 text-xs font-medium text-accent-text">All</button>
                  <button type="button" onClick={() => setExportModules([])} className="border-0 bg-transparent p-0 text-xs font-medium text-accent-text">None</button>
                </span>
              </legend>
              {EXPORT_MODULES.map((m) => {
                const on = chosen.includes(m.id)
                const forced = m.id === 'ramps' && chosen.includes('semantic')
                const count = sections.find((s) => s.id === m.id)?.count ?? 0
                return (
                  <label key={m.id} className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-soft">
                    <input type="checkbox" checked={on} disabled={forced} aria-describedby={`mod-${m.id}`} onChange={() => toggleExportModule(m.id)} className="mt-0.5 h-4 w-4 accent-accent" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[13px] font-medium">{m.label}</span>
                      <span id={`mod-${m.id}`} className="text-[11px] text-muted">{forced ? 'Needed by semantic tokens' : m.note}</span>
                    </span>
                    <span className="rounded-md bg-soft px-1.5 py-px font-mono text-[11px] text-muted">{count}</span>
                  </label>
                )
              })}
            </fieldset>
          </div>

          <div className="flex min-w-0 flex-col gap-2 p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="m-0 text-xs font-semibold uppercase tracking-[.08em] text-muted">Preview</h3>
              <span className="font-mono text-xs text-muted">{built.filename}</span>
            </div>
            {empty ? (
              <p role="status" className="m-0 rounded-[10px] border border-dashed border-edge p-6 text-center text-[13px] text-muted">Choose at least one module to export.</p>
            ) : (
              <pre aria-label="Export preview" className="m-0 max-h-[420px] min-h-[200px] overflow-auto whitespace-pre rounded-[10px] bg-night p-4 font-mono text-xs leading-[1.65] text-code">{preview}{hidden > 0 ? `\n… ${hidden} more lines in the file` : ''}</pre>
            )}
          </div>
        </div>

        <footer className="flex flex-wrap items-center gap-3 border-t border-line px-6 py-4">
          <p role="status" className="m-0 flex-1 text-[13px] text-muted">
            {empty ? 'Nothing selected' : `${built.count} tokens · ${built.lines} lines · ${built.filename}`}
          </p>
          <button type="button" onClick={closeExport} className="h-10 rounded-[9px] border border-line bg-surface px-4 text-[13px] font-medium text-ink">Cancel</button>
          <button
            type="button"
            disabled={empty}
            onClick={async () => flashCopied(await copyText(built.text))}
            className="flex h-10 items-center gap-2 rounded-[9px] border border-line bg-surface px-4 text-[13px] font-medium text-ink disabled:opacity-50"
          >
            <Icon name="copy" size={15} strokeWidth={1.7} />
            {copied ? 'Copied' : copyFailed ? 'Copy failed' : 'Copy'}
          </button>
          <button
            type="button"
            disabled={empty}
            onClick={() => {
              downloadText(built.filename, built.text, built.mime)
              closeExport()
            }}
            className="flex h-10 items-center gap-2 rounded-[9px] border-0 bg-btn px-4 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(210,64,11,.3)] disabled:opacity-50"
          >
            <Icon name="download" size={15} strokeWidth={1.8} />
            Download
          </button>
        </footer>
      </div>
    </div>
  )
}
