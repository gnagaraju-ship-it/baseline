import { useMemo } from 'react'
import { luminance } from '../../lib/contrast'
import { refOf } from '../model'
import { activeResolved, useV2 } from '../store'

/** The ramps of the active system and theme, any number of steps, named by the system. */
export function PaletteScreen() {
  const s = useV2()
  const r = useMemo(() => activeResolved(s), [s.themes, s.activeSystemId, s.activeThemeId]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="flex flex-col gap-5 px-7 pb-12 pt-6">
      {r.system.recipes.map((x) => {
        const steps = x.steps.map((label) => {
          const v = r.find(refOf(x.collection, `${x.family}/${label}`))
          return { label, hex: String(v ? Object.values(v.cells)[0].value : '') }
        })
        const base = steps[x.base - 1]
        return (
          <section key={x.id} aria-label={x.name} className="rounded-[14px] border border-line bg-surface">
            <header className="flex items-center gap-3 border-b border-line-faint py-2.5 pl-5 pr-3">
              <span className="h-4 w-4 rounded" style={{ background: base?.hex }} />
              <h2 className="m-0 text-base font-semibold">{x.name}</h2>
              <span className="font-mono text-[13px] text-muted">{base?.hex}</span>
              <span className="ml-auto text-xs text-muted">{steps.length} steps</span>
            </header>
            <div className="overflow-x-auto p-3.5">
              <div className="grid gap-[3px]" style={{ minWidth: steps.length * 56, gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
                {steps.map((st, i) => (
                  <div key={st.label} aria-label={`${x.name} ${st.label}, ${st.hex}`} role="img" className="relative flex flex-col overflow-hidden rounded-md border border-line-faint bg-surface">
                    <span className="block h-[60px]" style={{ background: st.hex }} />
                    {i === x.base - 1 && <span className="absolute right-2 top-2 h-[7px] w-[7px] rounded-full" style={{ background: luminance(st.hex.slice(1, 7)) > 0.4 ? '#18181B' : '#FFFFFF' }} />}
                    <span className="flex flex-col gap-[2px] px-2 pb-2 pt-2">
                      <span className="text-[13px] font-semibold">{st.label}</span>
                      <span className="font-mono text-[11px] text-muted">{st.hex.slice(1)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}
