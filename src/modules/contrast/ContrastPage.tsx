import { copyText, downloadText } from '../../lib/browser'
import { toCss } from '../../lib/colour'
import { THRESHOLDS, type Standard } from '../../lib/contrast'
import { gridColours, scoreFor, thresholdInfo } from '../../lib/contrastGrid'
import { useProject } from '../../store/project'
import { ColourLayout } from '../colour/ColourLayout'
import { usePalettes } from '../colour/usePalettes'
import { ContrastGrid } from './ContrastGrid'
import { DetailCard } from './DetailCard'

const GUIDES: Array<[Standard, string]> = [['apca', 'WCAG 3 · APCA'], ['wcag', 'WCAG 2']]
const h3 = 'm-0 text-xs font-semibold uppercase tracking-[.08em] text-muted'

export function ContrastPage() {
  const { palettes, rows } = usePalettes()
  const { contrast, setContrastPalette, setContrastStandard, setContrastThreshold, selectContrastCell, flashCopied } = useProject()
  const { standard, cell } = contrast
  const threshold = contrast.threshold[standard]

  // The chosen palette may have been removed in the Brand panel; fall back to the first one.
  const palette = palettes.find((p) => p.key === contrast.palette) ?? palettes[0]
  const colours = gridColours(palette)
  const text = colours[cell[0]]
  const bg = colours[cell[1]]
  const score = cell[0] === cell[1] ? 0 : scoreFor(standard, text.hex, bg.hex)
  const info = thresholdInfo(standard, threshold)

  async function copyAll() {
    flashCopied(await copyText(toCss(rows)))
  }

  const option = (on: boolean) => `rounded-lg border text-left text-[13px] ${on ? 'border-edge bg-surface font-semibold' : 'border-transparent bg-transparent'} text-ink`

  return (
    <ColourLayout current="/contrast" exportCount={rows.length} onCopyAll={copyAll} onExport={() => downloadText('tokens.css', toCss(rows))}>
      <div className="flex flex-col gap-5 px-7 pb-12 pt-5">
        <div role="group" aria-label="Palette" className="flex flex-wrap gap-2">
          {palettes.map((p) => {
            const on = p.key === palette.key
            return (
              <button
                key={p.key}
                type="button"
                aria-pressed={on}
                onClick={() => setContrastPalette(p.key)}
                className={`flex h-[34px] items-center gap-2 rounded-full border pl-2.5 pr-3.5 text-[13px] font-medium ${on ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface text-ink-2'}`}
              >
                <span className="h-3 w-3 rounded-full" style={{ background: `#${p.hex}`, boxShadow: `0 0 0 2px ${on ? 'var(--color-ink-3)' : 'var(--color-surface)'}` }} />
                {p.name}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-start gap-5">
          <div className="flex max-w-[260px] flex-[1_1_220px] flex-col gap-[18px]">
            <div className="flex flex-col gap-2">
              <h3 className={h3}>Guidelines</h3>
              {GUIDES.map(([key, label]) => (
                <button key={key} type="button" aria-pressed={standard === key} onClick={() => setContrastStandard(key)} className={`h-10 px-3 ${option(standard === key)}`}>{label}</button>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className={h3}>{standard === 'apca' ? 'APCA Lc' : 'Contrast ratio'}</h3>
              {THRESHOLDS[standard].map(([min, label]) => (
                <button key={label} type="button" aria-pressed={min === threshold} onClick={() => setContrastThreshold(min)} className={`h-9 px-3 ${option(min === threshold)}`}>{label}</button>
              ))}
              <div className="mt-1.5 rounded-lg bg-soft px-3 py-2.5 text-xs text-ink-3">
                <b>{standard === 'apca' ? 'Lc ' : ''}{info.label}</b> — {info.description}
              </div>
            </div>
            <DetailCard standard={standard} text={text} bg={bg} score={score} />
          </div>

          <ContrastGrid label={`${palette.name} contrast grid`} colours={colours} standard={standard} threshold={threshold} cell={cell} onSelect={selectContrastCell} />
        </div>
      </div>
    </ColourLayout>
  )
}
