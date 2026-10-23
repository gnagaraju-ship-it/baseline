import { ColourField } from '../../components/ColourField'
import { Logo } from '../../components/Logo'
import { ELEVATION_PRESETS, type ElevationPresetKey } from '../../lib/elevation'
import { useProject } from '../../store/project'

const h3 = 'm-0 text-xs font-semibold uppercase tracking-[.08em] text-muted'
const GROUPS = ['SOFT', 'HARD'] as const

export function ElevationSettingsPanel() {
  const { elevation, applyElevationPreset, setShadowColour } = useProject()

  const item = (k: ElevationPresetKey) => {
    const on = elevation.preset === k
    return (
      <button key={k} type="button" aria-pressed={on} onClick={() => applyElevationPreset(k)} className={`flex h-[38px] items-center justify-between rounded-lg border-0 px-3 text-[13px] hover:bg-soft ${on ? 'bg-accent font-semibold text-white hover:bg-accent' : 'bg-transparent font-normal text-ink-2'}`}>
        {ELEVATION_PRESETS[k].label}
        <span className="text-[11px] opacity-85">{ELEVATION_PRESETS[k].levels.length}</span>
      </button>
    )
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <Logo size={32} />
        <div className="text-base font-semibold">Elevation</div>
      </div>

      <div className="flex flex-col gap-[22px] p-5">
        <section className="flex flex-col gap-1">
          <h3 className={`${h3} mb-2`}>Presets</h3>
          {GROUPS.map((g) => (
            <div key={g} role="group" aria-label={g} className="flex flex-col gap-1">
              <div className="px-1 pb-1 pt-2 text-[10px] font-semibold tracking-[.1em] text-muted">{g}</div>
              {(Object.keys(ELEVATION_PRESETS) as ElevationPresetKey[]).filter((k) => ELEVATION_PRESETS[k].group === g).map(item)}
            </div>
          ))}
          <div className="my-2 h-px bg-line" />
          {item('custom')}
        </section>

        <section className="flex flex-col gap-2">
          <h3 className={h3}>Base colour</h3>
          <ColourField id="shadow-hex" label="Shadow" value={elevation.shadow} fallback="000000" onChange={setShadowColour} />
        </section>
      </div>
      <div className="flex-1" />
      <div className="border-t border-line px-5 py-4 text-[13px] text-muted">Baseline</div>
    </>
  )
}
