import { useState, type FormEvent } from 'react'
import { Icon } from '../../components/Icon'
import { Logo } from '../../components/Logo'
import { NumberField } from '../../components/NumberField'
import { ThemeMenu } from '../../components/ThemeMenu'
import { resolveSet, type ImportedCollection, type ImportedVariable } from '../../lib/importedTokens'
import { barWidth, formatSpacing, parseCustom } from '../../lib/spacing'
import { useProject } from '../../store/project'
import { useSectionCss } from '../colour/useSectionCss'
import { NameField } from '../imported/ImportedPage'
import { SpacingLayout } from './SpacingLayout'

const card = 'flex flex-col rounded-[14px] border border-line px-6 py-5'
const head = 'text-[11px] font-semibold tracking-[.08em] text-muted'
const h3 = 'm-0 text-xs font-semibold uppercase tracking-[.08em] text-muted'
const btn = 'h-8 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink-3'

const PRIM = '_Primitives'
const SPACING = '3. Spacing'
const RADIUS = '2. Radius'

function Panel() {
  const reset = useProject((s) => s.resetImportedCollection)
  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <Logo size={32} />
        <div className="flex-1 text-base font-semibold">Spacing</div>
        <ThemeMenu variant="chip" />
      </div>
      <div className="flex flex-col gap-6 p-5">
        <section className="flex flex-col gap-2.5">
          <h3 className={h3}>This theme</h3>
          <p className="m-0 text-xs leading-[1.55] text-muted">Spacing steps, spacing tokens and radius come from the Untitled files. Change a value, point a token at another step, rename, add or remove. Values are in px; the unit switch only changes how they are shown.</p>
        </section>
        <section className="flex flex-col gap-2">
          <h3 className={h3}>Reset to the files</h3>
          {[[PRIM, 'Spacing scale'], [SPACING, 'Spacing tokens'], [RADIUS, 'Radius']].map(([c, label]) => (
            <button key={c} type="button" onClick={() => reset(c)} className={`${btn} h-9 text-left`}>Reset {label.toLowerCase()}</button>
          ))}
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
  const count = scale.length + tokens.length + radius.length

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

  return (
    <SpacingLayout css={css} exportCount={count} onExport={() => openExport(['spacing'])} panel={<Panel />}>
      <div className="flex flex-col gap-5 px-7 pb-12 pt-6">
        <section aria-label="Scale" className={`${card} gap-4`}>
          <div>
            <h2 className="m-0 mb-1 text-base font-semibold">Scale</h2>
            <p className="m-0 text-[13px] text-muted">The spacing steps. Tokens below point at these. {scale.length} steps.</p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-x-8 gap-y-1">
            {scaleSorted.map((v) => {
              const px = value(PRIM, v)
              return (
                <div key={v.name} className="flex min-h-10 items-center gap-2.5 border-b border-line-faint">
                  <span className="w-[78px] font-mono text-sm font-bold text-ink">{formatSpacing(px, unit)}</span>
                  <span aria-hidden="true" className="h-2 rounded-sm" style={{ width: barWidth(px), background: 'var(--color-accent-bar)' }} />
                  <span className="min-w-0 flex-1"><NameField collection={PRIM} name={v.name} /></span>
                  <NumberField id={`scale-${v.name}`} ariaLabel={`${v.name} ${modeOf(PRIM)}`} value={px} min={0} className="h-8 w-[72px] px-1.5 text-right" onCommit={(n) => n !== null && setImportedValue(PRIM, v.name, modeOf(PRIM), n)} />
                  <button type="button" aria-label={`Remove ${v.name}`} onClick={() => removeImportedVariable(PRIM, v.name)} className="flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent text-muted hover:bg-soft"><Icon name="close" size={13} strokeWidth={2} /></button>
                </div>
              )
            })}
          </div>
          <form noValidate onSubmit={add} className="flex items-center gap-2">
            <label htmlFor="custom-px" className="sr-only">Custom value in px</label>
            <input id="custom-px" type="number" min={0} max={400} placeholder="+ custom px" value={draft} aria-invalid={invalid} onChange={(e) => { setDraft(e.target.value); setInvalid(false) }} className={`inp h-9 w-[150px] font-mono ${invalid ? 'border-danger' : ''}`} />
            <button type="submit" className="h-9 rounded-lg border border-line bg-surface px-3 text-[13px]">Add</button>
            {invalid && <span role="alert" className="text-xs text-danger">Enter a whole number from 0 to 400.</span>}
          </form>
        </section>

        <section aria-label="Tokens" className={`${card} gap-3.5`}>
          <div>
            <h2 className="m-0 mb-1 text-base font-semibold">Tokens</h2>
            <p className="m-0 text-[13px] text-muted">Named spacing. Each one follows a step of the scale; type a value to give it one of its own.</p>
          </div>
          <div className="overflow-x-auto">
            <div role="table" aria-label="Spacing tokens" className="min-w-[640px]">
              <div role="row" className={`${head} grid gap-3 border-b border-line py-2`} style={{ gridTemplateColumns: 'minmax(0,1.2fr) 90px minmax(0,1.4fr) 84px 28px' }}>
                <span role="columnheader">TOKEN</span><span role="columnheader">VALUE</span><span role="columnheader">FOLLOWS</span><span role="columnheader">PX</span><span />
              </div>
              {tokens.map((t) => {
                const mode = modeOf(SPACING)
                const px = value(SPACING, t)
                const follows = t.values[mode]?.a ?? ''
                return (
                  <div key={t.name} role="row" className="grid min-h-[40px] items-center gap-3 border-b border-line-faint" style={{ gridTemplateColumns: 'minmax(0,1.2fr) 90px minmax(0,1.4fr) 84px 28px' }}>
                    <span role="rowheader"><NameField collection={SPACING} name={t.name} /></span>
                    <span role="cell" className="flex items-center gap-2 font-mono text-[13px]">
                      {formatSpacing(px, unit)}
                      <span aria-hidden="true" className="h-2 rounded-sm" style={{ width: barWidth(px), background: 'var(--color-accent-bar)' }} />
                    </span>
                    <span role="cell">
                      <select aria-label={`${t.name} follows`} value={follows} onChange={(e) => e.target.value && setImportedAlias(SPACING, t.name, mode, e.target.value)} className="inp h-8 w-full font-mono text-xs">
                        <option value="">Own value</option>
                        {scaleSorted.map((p) => <option key={p.name} value={`${PRIM}::${p.name}`}>{p.name}</option>)}
                      </select>
                    </span>
                    <span role="cell"><NumberField id={`tok-${t.name}`} ariaLabel={`${t.name} ${mode}`} value={px} min={0} className="h-8 w-[76px] px-1.5 text-right" onCommit={(n) => n !== null && setImportedValue(SPACING, t.name, mode, n)} /></span>
                    <button type="button" aria-label={`Remove ${t.name}`} onClick={() => removeImportedVariable(SPACING, t.name)} className="flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent text-muted hover:bg-soft"><Icon name="close" size={13} strokeWidth={2} /></button>
                  </div>
                )
              })}
            </div>
          </div>
          <button type="button" onClick={() => addImportedVariable(SPACING)} className={`${btn} self-start`}>+ Add spacing token</button>
        </section>

        <section aria-label="Radius" className={`${card} gap-4`}>
          <div>
            <h2 className="m-0 mb-1 text-base font-semibold">Radius</h2>
            <p className="m-0 text-[13px] text-muted">Corner radius tokens, each drawn on a sample box.</p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3.5">
            {radius.map((r) => {
              const mode = modeOf(RADIUS)
              const px = value(RADIUS, r)
              return (
                <div key={r.name} className="flex flex-col gap-2.5 rounded-xl border border-line-faint p-3">
                  <div aria-hidden="true" className="h-[72px] border-2 bg-accent-wash" style={{ borderColor: 'var(--color-accent-bar)', borderRadius: Math.min(px, 36) }} />
                  <div className="flex items-center justify-between gap-1">
                    <NameField collection={RADIUS} name={r.name} />
                    <button type="button" aria-label={`Remove ${r.name}`} onClick={() => removeImportedVariable(RADIUS, r.name)} className="flex h-6 w-6 flex-none items-center justify-center rounded-md border-0 bg-transparent text-muted hover:bg-soft"><Icon name="close" size={12} strokeWidth={2} /></button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <NumberField id={`rad-${r.name}`} ariaLabel={`${r.name} ${mode}`} value={px} min={0} className="h-8 w-full px-1.5 text-right" onCommit={(n) => n !== null && setImportedValue(RADIUS, r.name, mode, n)} />
                    <span className="text-xs text-muted">px</span>
                  </div>
                </div>
              )
            })}
          </div>
          <button type="button" onClick={() => addImportedVariable(RADIUS)} className={`${btn} self-start`}>+ Add radius</button>
        </section>
      </div>
    </SpacingLayout>
  )
}
