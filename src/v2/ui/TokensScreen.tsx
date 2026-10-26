import { useMemo, useState } from 'react'
import { NumberField } from '../../components/NumberField'
import { clampAlpha } from '../../lib/colour'
import { refOf, splitRef } from '../model'
import type { ResolvedCell, ResolvedCollection, ResolvedSystem, ResolvedVariable } from '../resolve'
import { activeResolved, useV2 } from '../store'
import { DEFAULT_GROUP_TITLES } from '../systems/default'

const labelOf = (cell: ResolvedCell) => (cell.alias ? splitRef(cell.alias)[1].split('/').slice(-2).join('/') : String(cell.value))
const swatch = (value: string | number) => ({ background: `linear-gradient(${value}, ${value}), repeating-conic-gradient(#E4E4E7 0 25%, #FFFFFF 0 50%) 0 0 / 8px 8px` })

function Picker({ r, collection, variable, modeId, onClose }: { r: ResolvedSystem; collection: ResolvedCollection; variable: ResolvedVariable; modeId: string; onClose: () => void }) {
  const setCell = useV2((s) => s.setCell)
  const setOpacity = useV2((s) => s.setOpacity)
  const cell = variable.cells[modeId]
  const current = cell.alias ? splitRef(cell.alias)[1] : ''
  const first = r.system.recipes.find((x) => current.startsWith(`${x.family}/`)) ?? r.system.recipes[0]
  const [recipeId, setRecipeId] = useState(first.id)
  const recipe = r.system.recipes.find((x) => x.id === recipeId)!
  const modeName = collection.modes.find((m) => m.id === modeId)!.name
  const opacity = typeof cell.value === 'string' && /^#[0-9A-F]{8}$/i.test(cell.value) ? Math.round((parseInt(cell.value.slice(7, 9), 16) / 255) * 100) : 100

  return (
    <div role="dialog" aria-label={`${variable.path}, ${modeName}`} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-[0_12px_32px_rgba(24,24,27,.14)]">
      <div className="flex items-center gap-2">
        <span className="flex-1 truncate font-mono text-[13px] font-semibold">{variable.path}</span>
        <span className="rounded-[5px] border border-line px-1.5 py-[3px] text-[10px] font-semibold tracking-[.08em] text-muted">{modeName.toUpperCase()}</span>
        <button type="button" onClick={onClose} aria-label="Close picker" className="h-8 rounded-[7px] border-0 bg-soft px-2.5 text-xs">Close</button>
      </div>
      <div role="group" aria-label="Palette" className="flex flex-wrap gap-1.5">
        {r.system.recipes.map((x) => (
          <button key={x.id} type="button" aria-pressed={x.id === recipeId} onClick={() => setRecipeId(x.id)} className={`h-7 rounded-full border px-2.5 text-xs ${x.id === recipeId ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface text-ink-3'}`}>{x.name}</button>
        ))}
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(recipe.steps.length, 8)}, minmax(0, 1fr))` }}>
        {recipe.steps.map((label) => {
          const path = `${recipe.family}/${label}`
          const target = r.find(refOf(recipe.collection, path))
          const hex = String(target ? Object.values(target.cells)[0].value : '')
          const on = current === path
          return (
            <button key={label} type="button" aria-label={`${recipe.name} ${label}`} aria-pressed={on} onClick={() => setCell(collection.name, variable.path, modeId, { alias: refOf(recipe.collection, path) })} className="flex flex-col items-center gap-[3px] rounded-[9px] bg-surface p-1" style={{ border: `2px solid ${on ? 'var(--color-ink)' : 'transparent'}` }}>
              <span className="h-[30px] w-full rounded-md shadow-[inset_0_0_0_1px_rgba(0,0,0,.08)]" style={{ background: hex }} />
              <span className="text-[11px] font-semibold text-ink-2">{label}</span>
            </button>
          )
        })}
      </div>
      {typeof cell.value === 'string' && cell.value.startsWith('#') && (
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold text-ink-2">Opacity</span>
          <NumberField id={`op-${variable.path}-${modeId}`} ariaLabel={`${variable.path} ${modeName} opacity percent`} value={opacity} min={0} max={100} className="h-8 w-[72px] px-1.5 text-right" onCommit={(n) => n !== null && setOpacity(collection.name, variable.path, modeId, clampAlpha(n), cell.value as string)} />
          <span className="text-xs text-muted">%</span>
          {cell.overridden && <button type="button" onClick={() => setCell(collection.name, variable.path, modeId, null)} className="ml-auto h-8 rounded-lg border border-line bg-surface px-3 text-xs">Reset this value</button>}
        </div>
      )}
    </div>
  )
}

/** The semantic tokens of the active system: a link or a colour per mode, remapped by picking a ramp step. */
export function TokensScreen() {
  const s = useV2()
  const r = useMemo(() => activeResolved(s), [s.themes, s.activeSystemId, s.activeThemeId]) // eslint-disable-line react-hooks/exhaustive-deps
  const [open, setOpen] = useState<{ path: string; mode: string } | null>(null)
  const collections = r.collections.filter((c) => c.kind === 'semantic')

  return (
    <div className="flex flex-col gap-7 px-7 pb-14 pt-5">
      <p className="m-0 text-[13px] text-muted">Each token points at a ramp step per mode. Click a value to remap it.</p>
      {collections.map((c) => {
        const groups = [...new Set(c.variables.map((v) => v.group ?? ''))]
        return (
          <div key={c.name} className="flex flex-col gap-6">
            {groups.map((g) => {
              const rows = c.variables.filter((v) => (v.group ?? '') === g)
              const title = DEFAULT_GROUP_TITLES[g] ?? g
              return (
                <section key={g} aria-label={title || c.name} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5">
                    <h2 className="m-0 text-base font-semibold">{title || c.name}</h2>
                    <span className="text-xs text-muted">{rows.length}</span>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-line">
                    <div className="min-w-[640px]">
                      <div className="grid border-b border-line bg-panel text-[11px] font-semibold tracking-[.08em] text-muted" style={{ gridTemplateColumns: `minmax(0,1.3fr) repeat(${c.modes.length}, minmax(0,1fr))` }}>
                        <div className="px-4 py-2.5">TOKEN</div>
                        {c.modes.map((m) => <div key={m.id} className="px-4 py-2.5">{m.name.toUpperCase()}</div>)}
                      </div>
                      {rows.map((v) => {
                        const isOpen = open?.path === v.path
                        return (
                          <div key={v.path} className="border-b border-line-faint">
                            <div className="grid min-h-11 items-center" style={{ gridTemplateColumns: `minmax(0,1.3fr) repeat(${c.modes.length}, minmax(0,1fr))` }}>
                              <div className="truncate px-4 font-mono text-[13px]" title={v.path}>{v.path}</div>
                              {c.modes.map((m) => {
                                const cell = v.cells[m.id]
                                return (
                                  <button key={m.id} type="button" aria-label={`${v.path}, ${m.name}: ${labelOf(cell)}${cell.overridden ? ' (changed)' : ''}. Change`} aria-expanded={isOpen && open?.mode === m.id} onClick={() => setOpen(isOpen && open?.mode === m.id ? null : { path: v.path, mode: m.id })} className="flex h-11 items-center gap-2.5 border-0 bg-transparent pl-4 pr-3 text-left hover:bg-panel">
                                    <span className="h-[18px] w-[18px] flex-none rounded-[5px] shadow-[inset_0_0_0_1px_rgba(0,0,0,.1)]" style={swatch(cell.value)} />
                                    <span className="flex-1 truncate font-mono text-xs text-ink-3">{labelOf(cell)}</span>
                                    {cell.overridden && <span className="rounded-[5px] bg-accent-tint px-1.5 py-px text-[10px] font-semibold text-accent-text">changed</span>}
                                  </button>
                                )
                              })}
                            </div>
                            {isOpen && open && <div className="px-4 pb-4"><Picker r={r} collection={c} variable={v} modeId={open.mode} onClose={() => setOpen(null)} /></div>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </section>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
