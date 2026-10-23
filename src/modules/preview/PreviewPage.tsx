import { copyText } from '../../lib/browser'
import { toCss } from '../../lib/colour'
import { chartTheme, type PreviewMode } from '../../lib/chartTheme'
import { fontStack } from '../../lib/typeScale'
import { useProject } from '../../store/project'
import { ColourLayout } from '../colour/ColourLayout'
import { usePalettes } from '../colour/usePalettes'
import { AreaChartCard, BarChartCard, DonutCard, GoalsCard, LineChartCard } from './Charts'

const TYPES = ['Dashboard', 'Mobile', 'Web', 'Components', 'Charts', 'Logos', 'Gradients', 'Text']
const MODES: Array<[PreviewMode, string]> = [['light', 'Light'], ['dark', 'Dark']]

export function PreviewPage() {
  const openExport = useProject((s) => s.openExport)
  const { palettes, rows } = usePalettes()
  const { previewMode, setPreviewMode, flashCopied } = useProject()
  const headingFont = useProject((s) => s.type.headingFont)
  const bodyFont = useProject((s) => s.type.bodyFont)
  const theme = chartTheme(previewMode, palettes)

  async function copyAll() {
    flashCopied(await copyText(toCss(rows)))
  }

  return (
    <ColourLayout current="/preview" exportCount={rows.length} onCopyAll={copyAll} onExport={() => openExport(['ramps'])}>
      <div className="flex flex-col gap-4 px-7 pb-12 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Preview type" className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => {
              const on = t === 'Charts'
              return (
                <button
                  key={t}
                  type="button"
                  disabled={!on}
                  aria-pressed={on ? true : undefined}
                  title={on ? undefined : `${t} preview — not in v1`}
                  className={`h-[34px] rounded-full border px-3.5 text-[13px] ${on ? 'border-ink bg-ink font-medium text-on-ink' : 'border-line bg-surface text-ink-3 opacity-50'}`}
                >
                  {t}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-3.5 text-[13px] text-muted">
            <div role="group" aria-label="Theme" className="inline-flex gap-0.5 rounded-[9px] bg-line-faint p-[3px]">
              {MODES.map(([m, label]) => (
                <button key={m} type="button" aria-pressed={previewMode === m} onClick={() => setPreviewMode(m)} className={`h-[30px] rounded-[7px] border-0 px-3 text-[13px] font-medium text-ink ${previewMode === m ? 'bg-surface' : 'bg-transparent'}`}>
                  {label}
                </button>
              ))}
            </div>
            <span>Fonts: {headingFont}, {bodyFont}</span>
          </div>
        </div>

        <div data-testid="preview-canvas" className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4 rounded-[14px] p-4" style={{ background: theme.canvas, fontFamily: 'var(--preview-body)', ['--preview-heading' as string]: fontStack(headingFont), ['--preview-body' as string]: fontStack(bodyFont) }}>
          <BarChartCard theme={theme} />
          <LineChartCard theme={theme} />
          <AreaChartCard theme={theme} />
          <DonutCard theme={theme} />
          <GoalsCard theme={theme} />
        </div>
      </div>
    </ColourLayout>
  )
}
