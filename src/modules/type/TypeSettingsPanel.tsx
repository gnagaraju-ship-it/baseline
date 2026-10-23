import { Combobox, type ComboGroup } from '../../components/Combobox'
import { FONT_CATALOG, filterFonts, type FontRole } from '../../lib/fonts'
import { fontStack, PLATFORMS, RATIOS, WEB_PRESETS, isWeb, type PlatformIndex, type PresetKey } from '../../lib/typeScale'
import { useProject } from '../../store/project'
import { NumberField } from '../../components/NumberField'

const h3 = 'm-0 text-xs font-semibold uppercase tracking-[.08em] text-muted'
const pill = (on: boolean) => `h-[30px] rounded-full border px-3 text-xs font-medium ${on ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface text-ink-3'}`

const PLATFORM_ICONS: string[] = [
  'M3 5h18v12H3zM8 21h8M12 17v4',
  'M3 4h18v16H3zM9 4v16',
  'M7 3h10v18H7zM11 18h2',
  'M8 7h8v10H8zM9 7l1-4h4l1 4M9 17l1 4h4l1-4'
]

function fontGroups(query: string, role: FontRole, other: string): ComboGroup[] {
  const { suggested, all } = filterFonts(query, role, other)
  const opt = (name: string, tag?: string, hint?: string) => ({ value: name, label: name, tag, hint, style: { fontFamily: fontStack(name) } })
  const cat = (n: string) => FONT_CATALOG.find((f) => f.name === n)?.category
  if (query.trim()) return [{ options: all.map((f) => opt(f.name, f.category)) }]
  return [
    { label: 'Suggested', options: suggested.map((x) => opt(x.name, cat(x.name), x.reason)) },
    { label: 'All fonts', options: all.map((f) => opt(f.name, f.category)) }
  ]
}

export function TypeSettingsPanel() {
  const s = useProject()
  const t = s.type
  const web = isWeb(t.platform)

  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-night"><span className="h-3 w-3 rounded-[3px] bg-[#FF5A1F]" /></div>
        <div className="text-base font-semibold">Type Scale</div>
      </div>

      <div className="flex flex-col gap-[22px] p-5">
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h3 className={h3}>Platform</h3>
            <span className="rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold tracking-[.06em] text-muted">PROJECT</span>
          </div>
          <div role="group" aria-label="Platform" className="grid grid-cols-4 gap-1 rounded-[10px] border border-line bg-surface p-1">
            {PLATFORMS.map((label, i) => {
              const on = t.platform === i
              return (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
                  aria-pressed={on}
                  title={label}
                  onClick={() => s.setTypePlatform(i as PlatformIndex)}
                  className={`flex h-9 items-center justify-center rounded-[7px] border ${on ? 'border-accent-ring bg-accent-tint text-accent-text' : 'border-transparent bg-transparent text-muted'}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={PLATFORM_ICONS[i]} /></svg>
                </button>
              )
            })}
          </div>
        </section>

        {web && (
          <section className="flex flex-col gap-3">
            <h3 className={h3}>Scale</h3>
            <div className="flex justify-between text-[13px] font-medium"><label htmlFor="base-range">Base size</label><span className="font-mono font-semibold">{t.base}px</span></div>
            <div className="flex items-center gap-3">
              <input id="base-range" type="range" min={10} max={24} step={1} value={t.base} onChange={(e) => s.setTypeBase(Number(e.target.value))} className="m-0 w-full accent-accent" />
              <label htmlFor="base-num" className="sr-only">Base size in px</label>
              <NumberField id="base-num" value={t.base} min={10} max={24} className="w-16" onCommit={(n) => n !== null && n >= 10 && n <= 24 && s.setTypeBase(n)} />
            </div>
            <label htmlFor="ratio" className="text-[13px] font-medium">Scale ratio</label>
            <select id="ratio" value={String(t.ratio)} onChange={(e) => s.setTypeRatio(parseFloat(e.target.value))} className="inp w-full font-mono">
              {RATIOS.map(([name, v]) => <option key={name} value={String(v)}>{name} — {v}</option>)}
            </select>
            <div className="flex justify-between text-[13px] font-medium">Line grid <span className="font-mono text-[11px] font-normal text-muted">snaps line heights</span></div>
            <div role="group" aria-label="Line grid" className="flex gap-1.5">
              {[4, 8].map((g) => <button key={g} type="button" aria-pressed={t.grid === g} onClick={() => s.setTypeGrid(g)} className={pill(t.grid === g)}>{g}px</button>)}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-2.5">
          <h3 className={h3}>Presets</h3>
          <div role="group" aria-label="Preset" className="flex flex-wrap gap-1.5">
            {web
              ? (Object.keys(WEB_PRESETS) as PresetKey[]).map((k) => <button key={k} type="button" aria-pressed={t.preset === k} onClick={() => s.applyTypePreset(k)} className={pill(t.preset === k)}>{WEB_PRESETS[k].label}</button>)
              : ([['hig', 'Default HIG'], ['modern', 'Modern']] as const).map(([k, label]) => <button key={k} type="button" aria-pressed={t.apple === k} onClick={() => s.setAppleStyle(k)} className={pill(t.apple === k)}>{label}</button>)}
          </div>
        </section>

        <section className="flex flex-col gap-2.5">
          <h3 className={h3}>Fonts</h3>
          {([['headingFont', 'f-head', 'Heading / Display', 'SF Pro Display', 'heading', 'bodyFont'], ['bodyFont', 'f-body', web ? 'Body / Label' : 'Body / UI', 'SF Pro Text', 'body', 'headingFont']] as const).map(([key, id, label, apple, role, otherKey]) => {
            const value = web ? t[key] : apple
            return (
              <div key={id} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[13px] font-medium"><label htmlFor={id}>{label}</label><span className="font-mono text-[11px] font-normal text-muted">{value}</span></div>
                <Combobox
                  id={id}
                  value={value}
                  disabled={!web}
                  emptyText="No matching font"
                  onSelect={(f) => s.setTypeFont(key, f)}
                  groupsFor={(q) => (web ? fontGroups(q, role, t[otherKey]) : [{ options: [{ value: apple, label: apple }] }])}
                />
              </div>
            )
          })}
          {!web && <p className="m-0 text-xs leading-[1.55] text-muted">SF Pro is Apple’s system font — not available via Google Fonts. Use <span className="font-mono">-apple-system</span> in your CSS stack.</p>}
        </section>

        {web && (
          <section className="flex flex-col gap-3">
            <h3 className={h3}>Responsive</h3>
            <div className="flex items-center gap-2 text-[13px] font-medium">Desktop <span className="rounded-full bg-ink px-2 py-[3px] text-[10px] font-bold tracking-[.06em] text-on-ink">BASE</span></div>
            {(['tablet', 'mobile'] as const).map((k) => {
              const gridOn = s.grid.on[k === 'tablet' ? 'md' : 'xs']
              const v = { ...t[k], on: t[k].on && gridOn }
              const label = k === 'tablet' ? 'Tablet' : 'Mobile'
              return (
                <div key={k} className="grid grid-cols-[36px_1fr_44px_96px] items-center gap-2.5">
                  <button type="button" role="switch" aria-checked={v.on} aria-label={`${label} scaling`} disabled={!gridOn} title={gridOn ? undefined : `${label} is off in Grids`} onClick={() => s.setResponsive(k, { on: !v.on })} className={`flex h-5 w-9 border-0 p-0.5 ${v.on ? 'justify-end bg-accent' : 'justify-start bg-edge'} rounded-full`}>
                    <span className="h-4 w-4 rounded-full bg-surface shadow-[0_1px_2px_rgba(0,0,0,.2)]" />
                  </button>
                  <label htmlFor={`rs-${k}`} className="text-[13px]">{label}{!gridOn && <span className="block text-[10px] text-muted">off in Grids</span>}</label>
                  <span className="text-right font-mono text-xs text-ink-3">{v.pct}%</span>
                  <input id={`rs-${k}`} type="range" min={-30} max={0} step={1} value={v.pct} disabled={!v.on} onChange={(e) => s.setResponsive(k, { pct: Number(e.target.value) })} className="m-0 w-full accent-accent" />
                </div>
              )
            })}
            <p className="m-0 text-xs leading-[1.55] text-muted">Headings shrink on smaller breakpoints; body and labels stay put.</p>
          </section>
        )}
      </div>
      <div className="flex-1" />
      <div className="border-t border-line px-5 py-4 text-[13px] text-muted">Baseline</div>
    </>
  )
}
