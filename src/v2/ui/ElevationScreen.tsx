import { useMemo, useState } from 'react'
import { ColourField } from '../../components/ColourField'
import { NumberField } from '../../components/NumberField'
import { ELEVATION_PRESETS, shadowCss, type ElevationPresetKey, type LayerField } from '../../lib/elevation'
import { activeResolved, useV2 } from '../store'

const FIELDS: Array<[LayerField, string]> = [['x', 'X'], ['y', 'Y'], ['blur', 'Blur'], ['spread', 'Spread'], ['op', 'Opacity %']]
const label10 = 'text-[10.5px] font-semibold tracking-[.06em] text-muted'

function LevelName({ index, name }: { index: number; name: string }) {
  const rename = useV2((s) => s.renameElevationLevel)
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <input
      aria-label={`Level ${name} name`}
      value={draft ?? name}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (draft !== null) rename(index, draft); setDraft(null) }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      className="inp h-8 w-[140px] font-mono text-[13px]"
    />
  )
}

/** The multi-layer shadows of a system that has them: a preset, a colour, and every layer of every level. */
export function ElevationScreen() {
  const s = useV2()
  const r = useMemo(() => activeResolved(s), [s.themes, s.activeSystemId, s.activeThemeId]) // eslint-disable-line react-hooks/exhaustive-deps
  const e = r.elevation
  if (!e) return <p role="status" className="m-0 p-7 text-[13px] text-muted">This design system has no elevation.</p>
  return (
    <div className="flex flex-col gap-5 px-7 pb-12 pt-6">
      <section aria-label="Preset" className="flex flex-col gap-3 rounded-[14px] border border-line p-5">
        <h2 className="m-0 text-base font-semibold">Preset</h2>
        <div role="group" aria-label="Preset" className="flex flex-wrap gap-1.5">
          {(Object.keys(ELEVATION_PRESETS) as ElevationPresetKey[]).map((k) => (
            <button key={k} type="button" aria-pressed={e.preset === k} onClick={() => s.setElevationPreset(k)} className={`h-[30px] rounded-full border px-3 text-xs font-medium ${e.preset === k ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface text-ink-3'}`}>{ELEVATION_PRESETS[k].label}</button>
          ))}
        </div>
        <div className="max-w-[320px]">
          <ColourField id="v2-shadow" label="Shadow colour" value={e.shadow} fallback="000000" invalidMessage="Enter six hex digits." onChange={s.setShadowColour} />
        </div>
      </section>

      {e.tokens.map((level, i) => (
        <section key={i} aria-label={`Level ${level.name}`} className="flex flex-col gap-3 rounded-[14px] border border-line p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div aria-hidden="true" className="h-14 w-24 rounded-lg border border-line-faint bg-surface" style={{ boxShadow: shadowCss(level.layers, e.shadow) }} />
            <LevelName index={i} name={level.name} />
            <span className="font-mono text-xs text-muted">--elevation-{level.name}</span>
            <span className="flex-1" />
            <button type="button" onClick={() => s.removeElevationLevel(i)} disabled={e.tokens.length < 2} aria-label={`Remove level ${level.name}`} className="h-8 rounded-lg border border-line bg-surface px-3 text-xs disabled:opacity-50">Remove level</button>
          </div>
          {level.layers.map((layer, j) => (
            <div key={j} role="group" aria-label={`${level.name} layer ${j + 1}`} className="grid grid-cols-[repeat(5,minmax(0,1fr))_auto] items-end gap-2.5">
              {FIELDS.map(([f, name]) => (
                <div key={f} className="flex flex-col gap-1">
                  <label htmlFor={`el-${i}-${j}-${f}`} className={label10}>{name.toUpperCase()}</label>
                  <NumberField id={`el-${i}-${j}-${f}`} ariaLabel={`${level.name} layer ${j + 1} ${name}`} value={layer[f]} className="h-8 w-full px-1.5 text-right" onCommit={(n) => n !== null && s.setLayer(i, j, f, String(n))} />
                </div>
              ))}
              <button type="button" aria-label={`Remove ${level.name} layer ${j + 1}`} disabled={level.layers.length < 2} onClick={() => s.removeElevationLayer(i, j)} className="h-8 rounded-lg border border-line bg-surface px-2.5 text-xs disabled:opacity-50">Remove</button>
            </div>
          ))}
          <button type="button" onClick={() => s.addElevationLayer(i)} className="h-8 self-start rounded-lg border border-line bg-surface px-3 text-xs">+ Add layer</button>
        </section>
      ))}
      <button type="button" onClick={s.addElevationLevel} className="h-11 rounded-xl border border-dashed border-edge bg-transparent text-[13px] text-ink-3">+ Add level</button>
    </div>
  )
}
