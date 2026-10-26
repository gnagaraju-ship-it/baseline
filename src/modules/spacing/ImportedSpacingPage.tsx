import { useState, type FormEvent } from 'react'
import { Icon } from '../../components/Icon'
import { Logo } from '../../components/Logo'
import { NumberField } from '../../components/NumberField'
import { ThemeMenu } from '../../components/ThemeMenu'
import { followers, resolveSet, type ImportedCollection, type ImportedVariable } from '../../lib/importedTokens'
import { untitledThemeData } from '../../lib/themes'
import { barWidth, formatSpacing, parseCustom } from '../../lib/spacing'
import { useProject } from '../../store/project'
import { useSectionCss } from '../colour/useSectionCss'
import { NameField } from '../imported/ImportedPage'
import { SpacingLayout } from './SpacingLayout'

const card = 'flex flex-col rounded-[14px] border border-line px-6 py-5'
const head = 'text-[11px] font-semibold tracking-[.08em] text-muted'
const h3 = 'm-0 text-xs font-semibold uppercase tracking-[.08em] text-muted'
const label10 = 'text-[10.5px] font-semibold tracking-[.06em] text-muted'
const btn = 'h-8 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink-3'

const PRIM = '_Primitives'
const SPACING = '3. Spacing'
const RADIUS = '2. Radius'

type Pick = { collection: string; name: string } | null

const pillCls = (on: boolean) => `h-[30px] rounded-full border px-3 text-xs font-medium ${on ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface text-ink-3'}`

function Panel() {
  const s = useProject()
  const reset = s.resetImportedCollection
  const set = s.imported
  const count = (c: string, prefix?: string) => set?.collections.find((x) => x.name === c)?.variables.filter((v) => !prefix || v.name.startsWith(prefix)).length ?? 0
  const original = untitledThemeData().imported!
  const asFiles = [PRIM, SPACING, RADIUS].every((c) => JSON.stringify(set?.collections.find((x) => x.name === c)) === JSON.stringify(original.collections.find((x) => x.name === c)))
  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <Logo size={32} />
        <div className="flex-1 text-base font-semibold">Spacing</div>
        <ThemeMenu variant="chip" />
      </div>
      <div className="flex flex-col gap-6 p-5">
        <section className="flex flex-col gap-2.5">
          <h3 className={h3}>Presets</h3>
          <div role="group" aria-label="Preset" className="flex flex-wrap gap-1.5">
            <button type="button" aria-pressed={asFiles} onClick={() => [PRIM, SPACING, RADIUS].forEach(reset)} className={pillCls(asFiles)}>Untitled</button>
            <button type="button" aria-pressed={!asFiles} className={pillCls(!asFiles)}>Custom</button>
          </div>
          <p className="m-0 text-xs leading-[1.55] text-muted">{asFiles ? 'The values of the Untitled files.' : 'Changed from the Untitled files. Pick Untitled to put all of it back.'}</p>
        </section>
        <section className="flex flex-col gap-2">
          <div className="flex justify-between"><h3 className={h3}>Sections</h3><span className="text-[11px] text-muted">3</span></div>
          {[['Scale', count(PRIM, 'Spacing/'), 'steps'], ['Tokens', count(SPACING), 'tokens'], ['Radius', count(RADIUS), 'sizes']].map(([name, n, unit]) => (
            <div key={name} className="flex min-h-[34px] items-center gap-2.5">
              <span className="flex-1 text-[13px] font-medium">{name}</span>
              <span className="font-mono text-xs text-muted">{n} {unit}</span>
            </div>
          ))}
          <p className="m-0 text-xs leading-[1.55] text-muted">Untitled has no breakpoints for spacing: every value is one number. Values are stored in px; the unit switch changes how they show.</p>
        </section>
      </div>
      <div className="flex-1" />
      <div className="border-t border-line px-5 py-4 text-[13px] text-muted">Baseline</div>
    </>
  )
}

const valueOf = (v: ImportedVariable) => Number(Object.values(v.values)[0]?.v ?? 0)

/** Spacing and radius of a theme that follows a design system's tokens, laid out like the Spacing screen. */
export function ImportedSpacingPage() {
  const s = useProject()
  const { unit, openExport, setImportedValue, setImportedAlias, removeImportedVariable, addNamedImportedVariable, addImportedVariable } = s
  const set = s.imported!
  const css = useSectionCss('spacing')
  const resolved = resolveSet(set)
  const col = (name: string): ImportedCollection | undefined => set.collections.find((c) => c.name === name)
  const rcol = (name: string) => resolved.collections.find((c) => c.name === name)
  const value = (collection: string, v: ImportedVariable) => valueOf(rcol(collection)!.variables.find((x) => x.name === v.name)!)

  const scale = (col(PRIM)?.variables ?? []).filter((v) => v.name.startsWith('Spacing/'))
  const scaleSorted = [...scale].sort((a, b) => value(PRIM, a) - value(PRIM, b))
  const tokens = col(SPACING)?.variables ?? []
  const radius = col(RADIUS)?.variables ?? []
  const modeOf = (c: string) => col(c)!.modes[0]
  const count = [...scale, ...tokens, ...radius].filter((v) => !v.off).length

  const [open, setOpen] = useState<Pick>(null)
  const toggle = (collection: string, name: string) => setOpen(open?.collection === collection && open.name === name ? null : { collection, name })
  const [draft, setDraft] = useState('')
  const [invalid, setInvalid] = useState(false)
  function add(e: FormEvent) {
    e.preventDefault()
    const v = parseCustom(draft)
    if (v === null) return setInvalid(true)
    addNamedImportedVariable(PRIM, `Spacing/custom (${v}px)`, v)
    setDraft('')
    setInvalid(false)
  }

  /** The strip that opens under a value: name, px, what it follows, remove. */
  const editor = (collection: string, v: ImportedVariable) => {
    const mode = modeOf(collection)
    const px = value(collection, v)
    const follows = v.values[mode]?.a ?? ''
    const canFollow = collection !== PRIM
    return (
      <div role="group" aria-label={`Edit ${v.name}`} className="flex flex-wrap items-end gap-4 border-t border-accent-edge bg-accent-wash px-4 py-3">
        <div className="flex flex-col gap-1.5"><span className={label10}>NAME</span><NameField collection={collection} name={v.name} /></div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`px-${collection}-${v.name}`} className={label10}>VALUE (PX)</label>
          <NumberField id={`px-${collection}-${v.name}`} ariaLabel={`${v.name} ${mode}`} value={px} min={0} className="h-9 w-[100px] px-2 text-right" onCommit={(n) => n !== null && setImportedValue(collection, v.name, mode, n)} />
        </div>
        {canFollow && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`fl-${collection}-${v.name}`} className={label10}>FOLLOWS</label>
            <select id={`fl-${collection}-${v.name}`} aria-label={`${v.name} follows`} value={follows} onChange={(e) => (e.target.value ? setImportedAlias(collection, v.name, mode, e.target.value) : setImportedValue(collection, v.name, mode, px))} className="inp h-9 w-[230px] font-mono text-xs">
              <option value="">Own value</option>
              {scaleSorted.map((p) => <option key={p.name} value={`${PRIM}::${p.name}`}>{p.name}</option>)}
            </select>
          </div>
        )}
        <button type="button" aria-label={`Remove ${v.name}`} onClick={() => { removeImportedVariable(collection, v.name); setOpen(null) }} className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-xs text-ink-3"><Icon name="close" size={13} strokeWidth={2} />Remove</button>
      </div>
    )
  }

  const isOpen = (c: string, n: string) => open?.collection === c && open.name === n
  const openVar = open && col(open.collection)?.variables.find((v) => v.name === open.name)

  return (
    <SpacingLayout css={css} exportCount={count} onExport={() => openExport(['spacing'])} panel={<Panel />}>
      <div className="flex flex-col gap-5 px-7 pb-12 pt-6">
        <section aria-label="Scale" className={`${card} gap-4`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="m-0 mb-1 text-base font-semibold">Scale</h2>
              <p className="m-0 text-[13px] text-muted">Toggle a value on or off — the token name on the right is what it exports as. Click the name to change it. {scale.filter((v) => !v.off).length} of {scale.length} on.</p>
            </div>
            <button type="button" onClick={() => s.resetImportedCollection(PRIM)} className={btn}>Reset scale</button>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-8 gap-y-1">
            {scaleSorted.map((v) => {
              const px = value(PRIM, v)
              const on = !v.off
              const used = followers(set, PRIM, v.name)
              const opened = isOpen(PRIM, v.name)
              return (
                <div key={v.name} className={`flex min-h-10 items-center gap-2.5 border-b border-line-faint ${opened ? 'bg-accent-wash' : ''}`}>
                  <input type="checkbox" id={`sp-${v.name}`} checked={on} disabled={on && used.length > 0} title={on && used.length ? `Used by ${used.join(', ')}` : undefined} onChange={() => s.setImportedOff(PRIM, v.name, on)} className="m-0 h-[18px] w-[18px] accent-accent" />
                  <label htmlFor={`sp-${v.name}`} className={`flex-1 font-mono text-sm ${on ? 'font-bold text-ink' : 'text-subtle'}`}>{formatSpacing(px, unit)}</label>
                  <span aria-hidden="true" className="h-2 rounded-sm" style={{ width: barWidth(px), background: on ? 'var(--color-accent-bar)' : 'var(--color-line)' }} />
                  <button type="button" aria-expanded={opened} aria-label={`Edit ${v.name}`} onClick={() => toggle(PRIM, v.name)} className={`w-[92px] truncate border-0 bg-transparent p-0 text-right font-mono text-[11px] hover:text-ink ${on ? 'text-muted' : 'text-subtle'}`}>{v.name.replace(/^Spacing\//, 'space-')}</button>
                </div>
              )
            })}
          </div>
          {open?.collection === PRIM && openVar && <div className="overflow-hidden rounded-[10px] border border-accent-edge">{editor(PRIM, openVar)}</div>}
          <form noValidate onSubmit={add} className="flex items-center gap-2">
            <label htmlFor="custom-px" className="sr-only">Custom value in px</label>
            <input id="custom-px" type="number" min={0} max={400} placeholder="+ custom px" value={draft} aria-invalid={invalid} onChange={(e) => { setDraft(e.target.value); setInvalid(false) }} className={`inp h-9 w-[150px] font-mono ${invalid ? 'border-danger' : ''}`} />
            <button type="submit" className="h-9 rounded-lg border border-line bg-surface px-3 text-[13px]">Add</button>
            {invalid && <span role="alert" className="text-xs text-danger">Enter a whole number from 0 to 400.</span>}
          </form>
        </section>

        <section aria-label="Tokens" className={`${card} gap-3.5`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="m-0 mb-1 text-base font-semibold">Tokens</h2>
              <p className="m-0 text-[13px] text-muted">Grouped the way Figma Variables groups by name. A token follows a step of the scale until it gets a value of its own.</p>
            </div>
            <button type="button" onClick={() => s.resetImportedCollection(SPACING)} className={btn}>Reset tokens</button>
          </div>
          <div className="overflow-x-auto">
            <div role="table" aria-label="Spacing tokens" className="min-w-[600px]">
              <div role="row" className={`${head} grid border-b border-line py-2`} style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr) minmax(0,1.2fr)' }}>
                <span role="columnheader">TOKEN</span><span role="columnheader" className="text-center">VALUE</span><span role="columnheader" className="text-center">FOLLOWS</span>
              </div>
              <div className={`${head} pb-1 pt-3.5`}>SPACING</div>
              {tokens.map((t) => {
                const mode = modeOf(SPACING)
                const px = value(SPACING, t)
                const follows = t.values[mode]?.a
                const on = isOpen(SPACING, t.name)
                return (
                  <div key={t.name} role="rowgroup">
                    <button type="button" role="row" aria-expanded={on} aria-label={`${t.name}, ${formatSpacing(px, unit)}`} onClick={() => toggle(SPACING, t.name)} className={`grid min-h-[38px] w-full items-center border-0 border-b border-line-faint text-left ${on ? 'bg-accent-wash' : 'bg-transparent hover:bg-panel'}`} style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr) minmax(0,1.2fr)' }}>
                      <span role="rowheader" className="font-mono text-[13px]">{t.name}</span>
                      <span role="cell" className="flex items-center justify-center gap-2"><span className="font-mono text-[13px]">{formatSpacing(px, unit)}</span><span aria-hidden="true" className="h-2 rounded-sm" style={{ width: barWidth(px), background: 'var(--color-accent-bar)' }} /></span>
                      <span role="cell" className="flex justify-center">{follows ? <span className="rounded bg-soft px-1.5 py-px font-mono text-[11px] text-muted">{follows.split('::')[1].replace(/^Spacing\//, 'space-')}</span> : <span className="rounded bg-warn-chip px-[5px] py-px text-[10px] font-semibold text-warn-text">own value</span>}</span>
                    </button>
                    {on && editor(SPACING, t)}
                  </div>
                )
              })}
            </div>
          </div>
          <button type="button" onClick={() => addImportedVariable(SPACING)} className={`${btn} self-start`}>+ Add spacing token</button>
        </section>

        <section aria-label="Radius" className={`${card} gap-4`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="m-0 mb-1 text-base font-semibold">Radius</h2>
              <p className="m-0 text-[13px] text-muted">Corner radius tokens, each drawn on a sample box. Click one to change it.</p>
            </div>
            <button type="button" onClick={() => s.resetImportedCollection(RADIUS)} className={btn}>Reset radius</button>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3.5">
            {radius.map((r) => {
              const px = value(RADIUS, r)
              const on = isOpen(RADIUS, r.name)
              return (
                <button key={r.name} type="button" aria-expanded={on} aria-label={`${r.name}, ${formatSpacing(px, unit)}`} onClick={() => toggle(RADIUS, r.name)} className={`flex flex-col gap-2.5 rounded-xl border p-3 text-left ${on ? 'border-accent-ring bg-accent-wash' : 'border-line-faint bg-transparent hover:bg-panel'}`}>
                  <div aria-hidden="true" className="h-[72px] w-full border-2 bg-accent-wash" style={{ borderColor: 'var(--color-accent-bar)', borderRadius: Math.min(px, 36) }} />
                  <span className="truncate font-mono text-xs">{r.name}</span>
                  <span className="font-mono text-[13px] font-bold">{formatSpacing(px, unit)}</span>
                </button>
              )
            })}
          </div>
          {open?.collection === RADIUS && openVar && <div className="overflow-hidden rounded-[10px] border border-accent-edge">{editor(RADIUS, openVar)}</div>}
          <button type="button" onClick={() => addImportedVariable(RADIUS)} className={`${btn} self-start`}>+ Add radius</button>
        </section>
      </div>
    </SpacingLayout>
  )
}
