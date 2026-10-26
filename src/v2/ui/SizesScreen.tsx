import { useMemo, useState, type FormEvent } from 'react'
import { Icon } from '../../components/Icon'
import { NumberField } from '../../components/NumberField'
import { barWidth, parseCustom } from '../../lib/spacing'
import { refOf, splitRef, type DimensionSection } from '../model'
import type { ResolvedCollection, ResolvedSystem, ResolvedVariable } from '../resolve'
import { activeResolved, useV2 } from '../store'

const card = 'flex flex-col gap-3 rounded-[14px] border border-line px-6 py-5'

const rowsOf = (r: ResolvedSystem, sec: DimensionSection): { collection: ResolvedCollection; variables: ResolvedVariable[] } => {
  const collection = r.collections.find((c) => c.name === sec.collection)!
  return { collection, variables: collection.variables.filter((v) => !sec.prefix || v.path.startsWith(sec.prefix)) }
}

const num = (v: string | number) => (typeof v === 'number' ? v : parseFloat(v) || 0)

function Section({ r, sec }: { r: ResolvedSystem; sec: DimensionSection }) {
  const { setCell, addNumber, removeAdded } = useV2()
  const { collection, variables } = rowsOf(r, sec)
  const target = sec.follows ? r.system.dimensions!.find((d) => d.id === sec.follows) : undefined
  const choices = target ? rowsOf(r, target).variables : []
  const single = collection.modes.length === 1
  const addedHere = (path: string) => !!r.theme.added?.[collection.name]?.some((v) => v.path === path)
  const [draft, setDraft] = useState('')
  const [invalid, setInvalid] = useState(false)

  function add(e: FormEvent) {
    e.preventDefault()
    const n = parseCustom(draft)
    if (n === null || !sec.addPath) return setInvalid(true)
    addNumber(collection.name, sec.addPath.replace('{n}', String(n)), n, 'px')
    setDraft('')
    setInvalid(false)
  }

  const cols = `minmax(0,1.3fr) ${single ? '120px' : ''} repeat(${collection.modes.length}, 92px) ${target && single ? 'minmax(0,1.2fr)' : ''} 28px`
  return (
    <section aria-label={sec.title} className={card}>
      <div>
        <h2 className="m-0 text-base font-semibold">{sec.title}</h2>
        <p className="m-0 text-[13px] text-muted">{variables.length} values{target ? `, each can follow a value of ${target.title.toLowerCase()}` : ''}.</p>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[620px]">
          <div className="grid items-center gap-3 border-b border-line py-2 text-[11px] font-semibold tracking-[.08em] text-muted" style={{ gridTemplateColumns: cols }}>
            <span>NAME</span>{single && <span>PREVIEW</span>}
            {collection.modes.map((m) => <span key={m.id} className="text-center">{m.name.toUpperCase()}</span>)}
            {target && single && <span>FOLLOWS</span>}<span />
          </div>
          {variables.map((v) => {
            const first = v.cells[collection.modes[0].id]
            const px = num(first.value)
            return (
              <div key={v.path} className="grid min-h-[42px] items-center gap-3 border-b border-line-faint" style={{ gridTemplateColumns: cols }}>
                <span className="truncate font-mono text-[13px]" title={v.path}>{v.path}</span>
                {single && (
                  <span aria-hidden="true">
                    {sec.shape === 'radius' ? <span className="block h-8 w-12 border-2 bg-accent-wash" style={{ borderColor: 'var(--color-accent-bar)', borderRadius: Math.min(px, 16) }} />
                      : sec.shape === 'bar' ? <span className="block h-2 rounded-sm" style={{ width: barWidth(px), background: 'var(--color-accent-bar)' }} /> : null}
                  </span>
                )}
                {collection.modes.map((m) => (
                  <NumberField key={m.id} id={`${v.path}-${m.id}`} ariaLabel={`${v.path} ${m.name}`} value={num(v.cells[m.id].value)} min={0} className="h-8 w-full px-1.5 text-right" onCommit={(n) => n !== null && setCell(collection.name, v.path, m.id, { value: n })} />
                ))}
                {target && single && (
                  <select aria-label={`${v.path} follows`} value={first.alias ?? ''} onChange={(e) => (e.target.value ? setCell(collection.name, v.path, collection.modes[0].id, { alias: e.target.value }) : setCell(collection.name, v.path, collection.modes[0].id, { value: px }))} className="inp h-8 w-full font-mono text-xs">
                    <option value="">Own value</option>
                    {choices.map((c) => <option key={c.path} value={refOf(c.collection, c.path)}>{splitRef(refOf(c.collection, c.path))[1]}</option>)}
                  </select>
                )}
                {addedHere(v.path) ? (
                  <button type="button" aria-label={`Remove ${v.path}`} onClick={() => removeAdded(collection.name, v.path)} className="flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent text-muted hover:bg-soft"><Icon name="close" size={13} strokeWidth={2} /></button>
                ) : collection.modes.some((m) => v.cells[m.id].overridden) ? (
                  <button type="button" aria-label={`Reset ${v.path}`} title="Back to the system's value" onClick={() => collection.modes.forEach((m) => setCell(collection.name, v.path, m.id, null))} className="flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent text-muted hover:bg-soft"><Icon name="reset" size={13} /></button>
                ) : <span />}
              </div>
            )
          })}
        </div>
      </div>
      {sec.addPath && (
        <form noValidate onSubmit={add} className="flex items-center gap-2">
          <label htmlFor={`add-${sec.id}`} className="sr-only">Add a value in px to {sec.title}</label>
          <input id={`add-${sec.id}`} type="number" min={0} max={400} placeholder="+ custom px" value={draft} aria-invalid={invalid} onChange={(e) => { setDraft(e.target.value); setInvalid(false) }} className={`inp h-9 w-[150px] font-mono ${invalid ? 'border-danger' : ''}`} />
          <button type="submit" className="h-9 rounded-lg border border-line bg-surface px-3 text-[13px]">Add</button>
          {invalid && <span role="alert" className="text-xs text-danger">Enter a whole number from 0 to 400.</span>}
        </form>
      )}
    </section>
  )
}

/** Spacing, radius, widths, grid and the like: the sections a system lists, any mode count, with links between them. */
export function SizesScreen() {
  const s = useV2()
  const r = useMemo(() => activeResolved(s), [s.themes, s.activeSystemId, s.activeThemeId]) // eslint-disable-line react-hooks/exhaustive-deps
  const sections = r.system.dimensions ?? []
  if (!sections.length) return <p role="status" className="m-0 p-7 text-[13px] text-muted">This design system has no sizes.</p>
  return <div className="flex flex-col gap-5 px-7 pb-12 pt-6">{sections.map((d) => <Section key={d.id} r={r} sec={d} />)}</div>
}
