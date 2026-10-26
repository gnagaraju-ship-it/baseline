import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { Logo } from '../../components/Logo'
import { NumberField } from '../../components/NumberField'
import { ThemeMenu } from '../../components/ThemeMenu'
import { BREAKPOINTS_COLLECTION, byModule, resolveSet, type ImportedCollection, type ImportedVariable } from '../../lib/importedTokens'
import { formatSpacing } from '../../lib/spacing'
import { useProject } from '../../store/project'
import { useSectionCss } from '../colour/useSectionCss'
import { NameField } from '../imported/ImportedPage'
import { GridsLayout } from './GridsLayout'

const WIDTHS = '4. Widths'
const CONTAINERS = '5. Containers'
const PRIM = '_Primitives'
const FULL = 1920

const h3 = 'm-0 text-xs font-semibold uppercase tracking-[.08em] text-muted'
const mono9 = 'font-mono text-[9px] text-muted'
const pill = (on: boolean) => `flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold ${on ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface text-ink-3'}`

const px = (v: ImportedVariable | undefined, mode?: string) => Number((mode ? v?.values[mode] : undefined)?.v ?? Object.values(v?.values ?? {})[0]?.v ?? 0)

function Panel({ selected, onSelect, widths, containers, bp }: { selected: string; onSelect: (key: string) => void; widths: ImportedVariable[]; containers: ImportedVariable[]; bp: string }) {
  const { unit, resetImportedCollection, addImportedVariable } = useProject()
  const row = (collection: string, v: ImportedVariable, value: number) => {
    const key = `${collection}|${v.name}`
    const on = selected === key
    return (
      <button key={key} type="button" aria-pressed={on} onClick={() => onSelect(key)} className={`flex min-h-[34px] items-center gap-2.5 rounded-lg border px-2.5 text-left ${on ? 'border-accent-ring bg-accent-tint' : 'border-transparent bg-transparent hover:bg-soft'}`}>
        <span className="flex-1 truncate text-[13px] font-medium">{v.name}</span>
        <span className="font-mono text-xs text-muted">{formatSpacing(value, unit)}</span>
      </button>
    )
  }
  const resolved = resolveSet(useProject.getState().imported!)
  const val = (c: string, v: ImportedVariable) => px(resolved.collections.find((x) => x.name === c)?.variables.find((x) => x.name === v.name), bp)
  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <Logo size={32} />
        <div className="flex-1 text-base font-semibold">Grids</div>
        <ThemeMenu variant="chip" />
      </div>
      <div className="flex flex-col gap-6 p-5">
        <section aria-label="Widths list" className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between"><h3 className={h3}>Widths</h3><span className="text-[11px] text-muted">{widths.length}</span></div>
          {widths.map((v) => row(WIDTHS, v, val(WIDTHS, v)))}
          <div className="flex gap-1.5">
            <button type="button" onClick={() => addImportedVariable(WIDTHS)} className="mt-1 h-8 rounded-lg border border-dashed border-edge bg-transparent px-3 text-xs text-muted">+ Add width</button>
            <button type="button" onClick={() => resetImportedCollection(WIDTHS)} className="mt-1 h-8 rounded-lg border border-line bg-surface px-3 text-xs text-ink-3">Reset widths</button>
          </div>
        </section>
        <section aria-label="Containers list" className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between"><h3 className={h3}>Containers</h3><span className="text-[11px] text-muted">{containers.length}</span></div>
          {containers.map((v) => row(CONTAINERS, v, val(CONTAINERS, v)))}
          <div className="flex gap-1.5">
            <button type="button" onClick={() => addImportedVariable(CONTAINERS)} className="mt-1 h-8 rounded-lg border border-dashed border-edge bg-transparent px-3 text-xs text-muted">+ Add container</button>
            <button type="button" onClick={() => resetImportedCollection(CONTAINERS)} className="mt-1 h-8 rounded-lg border border-line bg-surface px-3 text-xs text-ink-3">Reset containers</button>
          </div>
        </section>
      </div>
      <div className="flex-1" />
      <div className="border-t border-line px-5 py-4 text-[13px] text-muted">Baseline</div>
    </>
  )
}

/** Widths and containers of a theme that follows a design system, laid out like the Grids screen. */
export function ImportedGridsPage() {
  const project = useProject()
  const { unit, openExport, setImportedValue, setImportedAlias, removeImportedVariable } = project
  const set = project.imported!
  const css = useSectionCss('grids')
  const resolved = resolveSet(set)
  const find = (c: string): ImportedCollection | undefined => set.collections.find((x) => x.name === c)
  const widths = find(WIDTHS)?.variables ?? []
  const containers = find(CONTAINERS)?.variables ?? []
  const [bp, setBp] = useState('XXL')
  const value = (c: string, v: ImportedVariable) => px(resolved.collections.find((x) => x.name === c)?.variables.find((x) => x.name === v.name), bp)
  const [selected, setSelected] = useState(`${WIDTHS}|${widths.find((w) => w.name === 'width-xl')?.name ?? widths[0]?.name ?? ''}`)

  const [collection, name] = selected.split('|')
  const token = (find(collection)?.variables ?? []).find((v) => v.name === name)
  const current = token ?? widths[0] ?? containers[0]
  const cname = token ? collection : widths[0] ? WIDTHS : CONTAINERS
  const modes = find(cname)!.modes
  const modeId = modes.includes(bp) ? bp : modes[0]
  const bpWidth = (name: string) => px(resolved.collections.find((x) => x.name === BREAKPOINTS_COLLECTION)?.variables.find((x) => x.name === name))
  const v = value(cname, current)
  const alias = current.values[modeId]?.a
  const scale = (find(PRIM)?.variables ?? []).filter((x) => x.name.startsWith('Spacing/'))
  const scaleSorted = [...scale].sort((a, b) => value(PRIM, a) - value(PRIM, b))
  const isPadding = /padding|margin/i.test(current.name)
  const sorted = [...(cname === WIDTHS ? widths : containers)].sort((a, b) => value(cname, a) - value(cname, b))
  const rank = sorted.findIndex((x) => x.name === current.name) + 1
  const total = widths.length + containers.length
  const frame = isPadding ? 1280 : v
  const pct = (n: number) => `${((n / Math.max(frame, 1)) * 100).toFixed(3)}%`
  const outer = Math.max(8, Math.min(100, (frame / FULL) * 100))

  const stats: Array<{ k: string; v: string; accent?: boolean }> = [
    { k: 'VALUE', v: formatSpacing(v, unit), accent: true },
    { k: 'PX', v: `${v}px` },
    { k: 'REM', v: `${+(v / 16).toFixed(3)}rem` },
    { k: 'SHARE OF 1920', v: `${Math.round((v / FULL) * 100)}%` },
    { k: 'RANK', v: `${rank} of ${sorted.length}` },
    { k: 'FOLLOWS', v: alias ? alias.split('::')[1] : 'own value' }
  ]

  return (
    <GridsLayout css={css} columns={total} exportCount={byModule(set).grids.reduce((n, c) => n + c.variables.length, 0)} onExport={() => openExport(['grids'])} tabLabel="Widths and containers" panel={<Panel selected={`${cname}|${current.name}`} onSelect={setSelected} widths={widths} containers={containers} bp={bp} />}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line-faint px-7 py-3">
        <span className="mr-1.5 text-[11px] font-semibold tracking-[.08em] text-muted">BREAKPOINT</span>
        <div role="group" aria-label="Breakpoint" className="flex flex-wrap gap-2">
          {[['XXL', 'breakpoint-xxl'], ['MD', 'breakpoint-md'], ['XS', 'breakpoint-xs']].map(([label, name]) => <button key={label} type="button" aria-pressed={bp === label} onClick={() => setBp(label)} className={pill(bp === label)}>{label}<span className="font-mono font-normal opacity-80">{bpWidth(name)}</span></button>)}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-line-faint px-7 py-3">
        <span className="mr-1.5 text-[11px] font-semibold tracking-[.08em] text-muted">WIDTH</span>
        <div role="group" aria-label="Width" className="flex flex-wrap gap-2">
          {widths.map((w) => <button key={w.name} type="button" aria-pressed={`${WIDTHS}|${w.name}` === `${cname}|${current.name}`} onClick={() => setSelected(`${WIDTHS}|${w.name}`)} className={pill(`${WIDTHS}|${w.name}` === `${cname}|${current.name}`)}>{w.name.replace(/^width-/, '')}<span className="font-mono font-normal opacity-80">{value(WIDTHS, w)}</span></button>)}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-line-faint px-7 py-3">
        <span className="mr-1.5 text-[11px] font-semibold tracking-[.08em] text-muted">CONTAINER</span>
        <div role="group" aria-label="Container" className="flex flex-wrap gap-2">
          {containers.map((c) => <button key={c.name} type="button" aria-pressed={`${CONTAINERS}|${c.name}` === `${cname}|${current.name}`} onClick={() => setSelected(`${CONTAINERS}|${c.name}`)} className={pill(`${CONTAINERS}|${c.name}` === `${cname}|${current.name}`)}>{c.name.replace(/^container-/, '')}<span className="font-mono font-normal opacity-80">{value(CONTAINERS, c)}</span></button>)}
        </div>
      </div>

      <div className="flex flex-col gap-[18px] px-7 pb-12 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="m-0 mb-1.5 text-[22px] font-semibold tracking-[-0.01em]">{current.name} · {formatSpacing(v, unit)}</h1>
            <p className="m-0 text-[13px] text-muted">
              {isPadding ? `Space kept free on each side of a container: ${formatSpacing(v, unit)}.` : `A ${formatSpacing(v, unit)} wide ${cname === WIDTHS ? 'width' : 'container'}, ${Math.round((v / FULL) * 100)}% of a 1920px screen.`}
              {alias ? ` At ${modeId} it follows ${alias.split('::')[1]}.` : ` At ${modeId} it has a value of its own.`}
            </p>
          </div>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-xs text-ink-3">{cname === WIDTHS ? 'Width' : 'Container'} <span className="font-mono text-muted">{rank} of {sorted.length}</span></span>
        </div>

        <div className="overflow-x-auto rounded-[14px] border border-line bg-surface px-6 py-9">
          <div className="relative mx-auto min-w-[280px]" style={{ width: `${outer.toFixed(2)}%` }}>
            <div className="relative h-[22px]" aria-hidden="true">
              <span className={`${mono9} absolute inset-x-0 border-b border-edge pb-[3px] text-center`}>{formatSpacing(frame, unit)}</span>
            </div>
            <div role="img" aria-label={`${current.name}: ${formatSpacing(v, unit)}`} className="overflow-hidden rounded-[10px] border border-edge bg-surface shadow-[0_8px_24px_rgba(24,24,27,.08)]">
              <div className="flex h-[22px] items-center gap-[5px] border-b border-line-soft bg-panel px-2.5">
                <span className="h-[7px] w-[7px] rounded-full bg-[#F87171]" /><span className="h-[7px] w-[7px] rounded-full bg-[#FBBF24]" /><span className="h-[7px] w-[7px] rounded-full bg-[#34D399]" />
              </div>
              <div className="relative h-[240px]">
                {isPadding ? (
                  <>
                    <div className="absolute inset-y-0 left-0 bg-accent-band" style={{ width: pct(v) }} />
                    <div className="absolute inset-y-0 right-0 bg-accent-band" style={{ width: pct(v) }} />
                    <div className="absolute inset-y-0 flex items-center justify-center font-mono text-[10px] text-muted" style={{ left: pct(v), right: pct(v) }}>content</div>
                  </>
                ) : (
                  <div className="absolute inset-0 bg-accent-band" />
                )}
              </div>
            </div>
            <div className="relative h-6" aria-hidden="true">
              {isPadding ? (
                <>
                  <span className={`${mono9} absolute top-1.5 -translate-x-1/2`} style={{ left: `${(v / frame) * 50}%` }}>{formatSpacing(v, unit)}</span>
                  <span className={`${mono9} absolute top-1.5 -translate-x-1/2`} style={{ left: `${100 - (v / frame) * 50}%` }}>{formatSpacing(v, unit)}</span>
                </>
              ) : <span className={`${mono9} absolute left-1/2 top-1.5 -translate-x-1/2`}>{formatSpacing(v, unit)}</span>}
            </div>
          </div>
        </div>

        <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] overflow-hidden rounded-xl border border-line">
          {stats.map((s) => (
            <div key={s.k} className="flex flex-col gap-1 border-r border-line-faint px-3.5 py-3">
              <dt className="text-[11px] font-semibold tracking-[.06em] text-muted">{s.k}</dt>
              <dd className={`m-0 truncate font-mono text-[15px] font-semibold ${s.accent ? 'text-accent-text' : 'text-ink'}`}>{s.v}</dd>
            </div>
          ))}
        </dl>

        <section aria-label="Edit" className="flex flex-wrap items-end gap-4 rounded-xl border border-line p-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold tracking-[.06em] text-muted">NAME</span>
            <NameField collection={cname} name={current.name} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="grid-token-px" className="text-[11px] font-semibold tracking-[.06em] text-muted">VALUE (PX)</label>
            <NumberField id="grid-token-px" ariaLabel={`${current.name} value`} value={v} min={0} className="h-9 w-[110px] px-2 text-right" onCommit={(n) => n !== null && setImportedValue(cname, current.name, modeId, n)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="grid-token-follows" className="text-[11px] font-semibold tracking-[.06em] text-muted">FOLLOWS</label>
            <select id="grid-token-follows" aria-label={`${current.name} follows`} value={alias ?? ''} onChange={(e) => (e.target.value ? setImportedAlias(cname, current.name, modeId, e.target.value) : setImportedValue(cname, current.name, modeId, v))} className="inp h-9 w-[240px] font-mono text-xs">
              <option value="">Own value</option>
              {scaleSorted.map((p) => <option key={p.name} value={`${PRIM}::${p.name}`}>{p.name}</option>)}
            </select>
          </div>
          <button type="button" onClick={() => removeImportedVariable(cname, current.name)} className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-xs text-ink-3"><Icon name="close" size={13} strokeWidth={2} />Remove {current.name}</button>
        </section>
      </div>
    </GridsLayout>
  )
}
