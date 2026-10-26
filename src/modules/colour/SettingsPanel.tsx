import { ColourField } from '../../components/ColourField'
import { Logo } from '../../components/Logo'
import { ThemeMenu } from '../../components/ThemeMenu'
import { Icon } from '../../components/Icon'
import {
  DEFAULT_HEX,
  DEFAULT_SECONDARY,
  DEFAULT_TERTIARY,
  MAX_UTILITY,
  defaultUtilityHex,
  nextUtilityId,
  NEUTRAL_PRESETS,
  neutralMini,
  type NeutralPreset,
  type Palette,
  type SemanticKey,
  type TokenRow
} from '../../lib/colour'
import { useProject } from '../../store/project'
import { SchemaBrand } from './SchemaBrand'
import { TokensList } from './TokensList'
import { useSchema } from './useSchema'

const SEMANTIC: Array<{ key: SemanticKey; label: string }> = [
  { key: 'info', label: 'Info' },
  { key: 'success', label: 'Success' },
  { key: 'caution', label: 'Caution' },
  { key: 'warning', label: 'Warning' },
  { key: 'critical', label: 'Critical' }
]

const h3 = 'm-0 text-xs font-semibold uppercase tracking-[.08em] text-muted'
const dashed = 'h-10 rounded-[10px] border border-dashed border-edge bg-transparent px-3.5 text-left text-[13px] text-muted'
const linkBtn = 'border-0 bg-transparent py-1.5 text-[13px] text-muted hover:text-ink'

function Divider() {
  return <div className="h-px bg-line" />
}

export function SettingsPanel({ palettes, rows }: { palettes: Palette[]; rows: TokenRow[] }) {
  const { settings, side, setSide, setText, setAlpha, setSecondary, setTertiary, addUtility, setUtilityHex, renameUtility, removeUtility, setNeutralPreset, setNeutralEnabled, setSemanticEnabled } = useProject()
  const neutral = palettes.find((p) => p.key === 'neutral')
  const { colour } = useSchema()

  return (
    <>
      <div className="flex items-center gap-3 px-5 pb-3 pt-4">
        <Logo size={32} />
        <div className="flex-1 text-base font-semibold tracking-[-0.01em]">Baseline</div>
        <ThemeMenu variant="chip" />
        <button type="button" disabled aria-label="Rename project" title="Rename project — not in v1" className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-muted opacity-60">
          <Icon name="edit" size={16} />
        </button>
      </div>

      <div role="tablist" aria-label="Panel" className="mx-5 grid grid-cols-2 border-b border-line">
        {(['brand', 'tokens'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={side === t}
            onClick={() => setSide(t)}
            className={`h-11 border-0 bg-transparent text-sm capitalize ${side === t ? 'font-semibold text-ink shadow-[inset_0_-2px_0_#E2531B]' : 'font-medium text-muted'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {side === 'tokens' ? (
        <TokensList rows={rows} />
      ) : colour ? (
        <SchemaBrand schema={colour} />
      ) : (
        <div className="flex flex-col gap-6 p-5">
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className={h3}>Brand</h3>
              <button type="button" disabled aria-label="Pick colour from image" title="Pick colour from image — not in v1" className="flex h-8 w-8 items-center justify-center rounded-[7px] border border-line bg-surface text-muted opacity-60">
                <Icon name="image" size={15} />
              </button>
            </div>
            <ColourField id="f-primary" label="Primary" alpha={settings.alpha?.primary} onAlpha={(n) => setAlpha('primary', n)} value={settings.text.primary} fallback={DEFAULT_HEX.primary} invalidMessage="Enter six hex digits, like #9D00D6." onChange={(v) => setText('primary', v)} />
            {settings.secondary != null ? (
              <ColourField id="f-secondary" label="Secondary" alpha={settings.alpha?.secondary} onAlpha={(n) => setAlpha('secondary', n)} value={settings.secondary} fallback={DEFAULT_SECONDARY} invalidMessage="Enter six hex digits." onChange={setSecondary} onRemove={() => setSecondary(null)} />
            ) : (
              <button type="button" onClick={() => setSecondary('#' + DEFAULT_SECONDARY.toLowerCase())} className={dashed}>+ Add secondary</button>
            )}
            {settings.tertiary != null ? (
              <ColourField id="f-tertiary" label="Tertiary" alpha={settings.alpha?.tertiary} onAlpha={(n) => setAlpha('tertiary', n)} value={settings.tertiary} fallback={DEFAULT_TERTIARY} invalidMessage="Enter six hex digits." onChange={setTertiary} onRemove={() => setTertiary(null)} />
            ) : (
              <button type="button" onClick={() => setTertiary('#' + DEFAULT_TERTIARY.toLowerCase())} className={dashed}>+ Add tertiary</button>
            )}
            {settings.utility.map((u) => (
              <ColourField
                key={u.id}
                id={`f-utility-${u.id}`}
                label={u.name}
                alpha={settings.alpha?.[`utility-${u.id}`]}
                onAlpha={(n) => setAlpha(`utility-${u.id}`, n)}
                value={u.hex}
                fallback={defaultUtilityHex(u.id)}
                invalidMessage="Enter six hex digits."
                onChange={(v) => setUtilityHex(u.id, v)}
                onRename={(n) => renameUtility(u.id, n)}
                onRemove={() => removeUtility(u.id)}
              />
            ))}
            <button
              type="button"
              onClick={addUtility}
              disabled={settings.utility.length >= MAX_UTILITY}
              title={settings.utility.length >= MAX_UTILITY ? `Up to ${MAX_UTILITY} utility colours` : 'Adds Utility ' + nextUtilityId(settings.utility)}
              className={`${dashed} disabled:opacity-60`}
            >
              + Add utility colour
            </button>
          </section>

          <Divider />

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className={h3}>Neutral</h3>
              {settings.neutral.enabled && <button type="button" onClick={() => setNeutralEnabled(false)} className={linkBtn}>Remove</button>}
            </div>
            {settings.neutral.enabled ? (
              <div className="flex flex-col gap-3">
                <div role="group" aria-label="Neutral source" className="inline-flex gap-0.5 self-start rounded-[9px] bg-line-faint p-[3px]">
                  <button type="button" aria-pressed="true" className="h-8 rounded-[7px] border-0 bg-surface px-3.5 text-[13px] font-medium text-ink shadow-[0_1px_2px_rgba(0,0,0,.08)]">Preset</button>
                  <button type="button" disabled aria-pressed="false" title="Custom neutral — not in v1" className="h-8 rounded-[7px] border-0 bg-transparent px-3.5 text-[13px] text-muted opacity-60">Custom</button>
                </div>
                <div className="relative flex h-11 items-center gap-2.5 rounded-[10px] border border-line bg-surface pl-2.5">
                  <div aria-hidden="true" className="flex gap-0.5 rounded-md border border-line-faint p-[3px]">
                    {neutral && neutralMini(neutral.steps).map((c, i) => <span key={i} className="h-5 w-3 rounded-[3px]" style={{ background: `#${c}` }} />)}
                  </div>
                  <label htmlFor="neutral-preset" className="sr-only">Neutral preset</label>
                  <select id="neutral-preset" value={settings.neutral.preset} onChange={(e) => setNeutralPreset(e.target.value as NeutralPreset)} className="h-full flex-1 border-0 bg-transparent pr-3 text-sm font-medium text-ink">
                    {(Object.keys(NEUTRAL_PRESETS) as NeutralPreset[]).map((k) => <option key={k} value={k}>{NEUTRAL_PRESETS[k].label}</option>)}
                  </select>
                </div>
                <p className="m-0 text-xs leading-[1.55] text-muted">Exact Tailwind values, resampled to the archetype’s density.</p>
              </div>
            ) : (
              <button type="button" onClick={() => setNeutralEnabled(true)} className={dashed}>+ Add neutral</button>
            )}
          </section>

          <Divider />

          <section className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <h3 className={h3}>Semantic</h3>
              {settings.semanticEnabled && <button type="button" onClick={() => setSemanticEnabled(false)} className={linkBtn}>Remove</button>}
            </div>
            {settings.semanticEnabled ? (
              <div className="flex flex-col gap-3.5">
                {SEMANTIC.map((f) => (
                  <ColourField key={f.key} id={`f-${f.key}`} label={f.label} alpha={settings.alpha?.[f.key]} onAlpha={(n) => setAlpha(f.key, n)} value={settings.text[f.key]} fallback={DEFAULT_HEX[f.key]} onChange={(v) => setText(f.key, v)} />
                ))}
              </div>
            ) : (
              <button type="button" onClick={() => setSemanticEnabled(true)} className={dashed}>+ Add semantic colors</button>
            )}
          </section>
        </div>
      )}

      <div className="flex-1" />
      <div className="border-t border-line px-5 py-4 text-[13px] text-muted">Baseline</div>
    </>
  )
}
