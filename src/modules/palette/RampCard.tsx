import { Icon } from '../../components/Icon'
import { downloadText } from '../../lib/browser'
import { toCss, tokenRows, withAlpha, type Palette } from '../../lib/colour'
import { luminance } from '../../lib/contrast'
import { useProject } from '../../store/project'

const iconBtn = 'flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-muted hover:bg-soft'

export function RampCard({ palette }: { palette: Palette }) {
  const selected = useProject((s) => s.selected)
  const select = useProject((s) => s.select)
  const setSide = useProject((s) => s.setSide)

  function edit() {
    setSide('brand')
    const id = palette.key === 'neutral' ? 'neutral-preset' : `f-${palette.key}`
    requestAnimationFrame(() => document.getElementById(id)?.focus())
  }

  return (
    <section aria-label={palette.name} className="rounded-[14px] border border-line bg-surface shadow-[0_1px_2px_rgba(24,24,27,.04)]">
      <header className="flex items-center gap-3 border-b border-line-faint py-2.5 pl-5 pr-3">
        <span className="h-4 w-4 rounded" style={{ background: `#${palette.hex}` }} />
        <h2 className="m-0 text-base font-semibold tracking-[-0.01em]">{palette.name}</h2>
        <span className="font-mono text-[13px] text-muted">#{palette.hex}</span>
        {palette.alpha < 100 && <span className="rounded border border-line px-1.5 py-px font-mono text-[11px] text-muted">{palette.alpha}% opacity</span>}
        <div className="ml-auto flex gap-1">
          <button type="button" className={iconBtn} aria-label={`Edit ${palette.name}`} onClick={edit}><Icon name="edit" size={15} /></button>
          <button type="button" className={iconBtn} aria-label={`Download ${palette.name} ramp`} onClick={() => downloadText(`${palette.key}.css`, toCss(tokenRows([palette])))}><Icon name="download" size={15} /></button>
        </div>
      </header>
      <div className="overflow-x-auto p-3.5">
        <div className="grid min-w-[896px] grid-cols-[repeat(16,minmax(0,1fr))] gap-[3px]">
          {palette.steps.map((h, i) => {
            const on = selected.key === palette.key && selected.index === i
            return (
              <button
                key={i}
                type="button"
                onClick={() => select(palette.key, i)}
                aria-pressed={on}
                aria-label={`${palette.name} ${i + 1}, #${h}`}
                className="relative flex flex-col overflow-hidden rounded-md border bg-surface p-0 text-left transition-[transform,box-shadow] duration-150"
                style={{ borderColor: on ? 'var(--color-ink)' : 'var(--color-line-faint)', transform: on ? 'translateY(-4px)' : 'none', boxShadow: on ? '0 8px 18px rgba(24,24,27,.18)' : 'none', zIndex: on ? 2 : 1 }}
              >
                <span className="block h-[68px]" style={{ background: `#${h}` }} />
                {i === palette.base - 1 && <span className="absolute right-2 top-2 h-[7px] w-[7px] rounded-full" style={{ background: luminance(h) > 0.4 ? '#18181B' : '#FFFFFF' }} />}
                <span className="flex flex-col gap-[3px] px-2 pb-[9px] pt-2.5">
                  <span className="text-[13px] font-semibold text-ink">{i + 1}</span>
                  <span className="font-mono text-[11px] text-muted">{h}</span>
                </span>
              </button>
            )
          })}
        </div>
        {palette.alpha < 100 && (
          <div role="group" aria-label={`${palette.name} at ${palette.alpha}% opacity`} className="mt-3 grid min-w-[896px] grid-cols-[repeat(16,minmax(0,1fr))] gap-[3px]">
            {palette.steps.map((h, i) => (
              <span
                key={i}
                title={`${palette.name} ${i + 1} at ${palette.alpha}%: #${withAlpha(h, palette.alpha)}`}
                data-testid="alpha-swatch"
                className="block h-8 rounded-md border border-line-faint"
                style={{ background: `linear-gradient(#${withAlpha(h, palette.alpha)}, #${withAlpha(h, palette.alpha)}), repeating-conic-gradient(#E4E4E7 0 25%, #FFFFFF 0 50%) 0 0 / 8px 8px` }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
