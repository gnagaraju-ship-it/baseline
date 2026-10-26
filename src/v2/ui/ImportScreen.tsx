import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImportError, inferSystem, parseFigmaFile, type FigmaCollection } from '../import/figma'
import { useV2 } from '../store'

const KIND: Record<string, string> = { ramp: 'Colour ramps', semantic: 'Semantic colours', type: 'Type', dimension: 'Sizes', other: 'Kept as it is' }

/** Bring a design system in from Figma variable exports: one JSON file per collection. */
export function ImportScreen() {
  const addSystem = useV2((s) => s.addSystem)
  const navigate = useNavigate()
  const [files, setFiles] = useState<FigmaCollection[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [name, setName] = useState('')

  async function read(list: FileList | File[]) {
    const found: FigmaCollection[] = []
    const bad: string[] = []
    for (const f of Array.from(list)) {
      try { found.push(parseFigmaFile(await f.text(), f.name)) } catch (e) { bad.push(e instanceof ImportError ? e.message : `${f.name} could not be read.`) }
    }
    setFiles(found)
    setErrors(bad)
    if (found.length && !name) setName('My design system')
  }

  const result = useMemo(() => {
    if (!files.length) return null
    try { return { ...inferSystem(files, name || 'My design system'), error: '' } } catch (e) { return { system: null, report: null, error: e instanceof ImportError ? e.message : 'These files could not be read as a design system.' } }
  }, [files, name])

  return (
    <div className="flex max-w-[860px] flex-col gap-5 px-7 pb-12 pt-6">
      <div>
        <h1 className="m-0 mb-1.5 text-[22px] font-semibold">Import a design system</h1>
        <p className="m-0 text-[13px] text-muted">Export each variable collection from Figma as JSON and choose all the files together. Baseline works out which collections are colour ramps, semantic colours, type and sizes.</p>
      </div>
      <label htmlFor="v2-files" className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-edge p-6 text-center">
        <b>Choose the JSON files</b>
        <small className="text-muted">one file per collection, selected together</small>
        <input id="v2-files" type="file" multiple accept=".json,application/json" className="sr-only" onChange={(e) => e.target.files && read(e.target.files)} />
      </label>
      {errors.map((e) => <p key={e} role="alert" className="m-0 text-[13px] text-danger">{e}</p>)}

      {result?.error && <p role="alert" className="m-0 text-[13px] text-danger">{result.error}</p>}
      {result?.report && result.system && (
        <>
          <div className="flex items-center gap-3">
            <label htmlFor="v2-sys-name" className="text-[13px] font-medium">Name</label>
            <input id="v2-sys-name" value={name} onChange={(e) => setName(e.target.value)} className="inp h-9 w-[260px]" />
          </div>
          <div role="table" aria-label="What was found" className="overflow-hidden rounded-xl border border-line">
            <div role="row" className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_80px_70px_minmax(0,1.4fr)] gap-3 border-b border-line bg-panel px-4 py-2.5 text-[11px] font-semibold tracking-[.08em] text-muted">
              <span role="columnheader">COLLECTION</span><span role="columnheader">USED AS</span><span role="columnheader">VARIABLES</span><span role="columnheader">MODES</span><span role="columnheader">FOUND</span>
            </div>
            {result.report.collections.map((c) => (
              <div key={c.name} role="row" className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_80px_70px_minmax(0,1.4fr)] gap-3 border-b border-line-faint px-4 py-2 text-[13px] last:border-b-0">
                <span role="rowheader" className="truncate font-mono">{c.name}</span><span role="cell">{KIND[c.kind]}</span><span role="cell">{c.variables}</span><span role="cell">{c.modes}</span><span role="cell" className="truncate text-muted">{c.note}</span>
              </div>
            ))}
          </div>
          <p role="status" className="m-0 text-[13px] text-ink-3">
            {result.report.ramps} colour ramps · {result.report.type ? `${result.report.type.steps} type steps` : 'no type'} · sizes: {result.report.sections.length ? result.report.sections.join(', ') : 'none'}
          </p>
          {result.report.warnings.map((w) => <p key={w} className="m-0 text-xs text-warn-text">{w}</p>)}
          <div className="flex gap-2">
            <button type="button" disabled={!name.trim()} onClick={() => { addSystem(result.system!); navigate('/v2') }} className="h-10 rounded-[9px] border-0 bg-btn px-4 text-[13px] font-semibold text-white disabled:opacity-50">Add design system</button>
          </div>
        </>
      )}
    </div>
  )
}
