import { copyText, downloadText } from '../../lib/browser'
import { toElevationCss } from '../../lib/elevation'
import { useProject } from '../../store/project'
import { ElevationLayout } from './ElevationLayout'
import { TokenCard } from './TokenCard'

const HEAD = 'grid grid-cols-[40px_minmax(200px,2.2fr)_1fr_repeat(5,minmax(76px,.8fr))_120px] gap-2.5 px-3 text-[11px] font-semibold tracking-[.06em] text-muted'

export function ElevationPage() {
  const { elevation, addElevation, flashCopied, copied, copyFailed } = useProject()
  const css = toElevationCss(elevation.tokens, elevation.shadow)

  async function copyCss() {
    flashCopied(await copyText(css))
  }

  return (
    <ElevationLayout exportCount={elevation.tokens.length} onExport={() => downloadText('elevation.css', css)}>
      <div className="overflow-x-auto px-7 pb-12 pt-5">
        <div className="flex min-w-[900px] flex-col gap-3">
          <div aria-hidden="true" className={HEAD}>
            <span /><span>TOKEN NAME</span><span>LAYER</span>
            <span className="text-center">X</span><span className="text-center">Y</span><span className="text-center">BLUR</span><span className="text-center">SPREAD</span><span className="text-center">COLOUR %</span>
            <span className="text-center">PREVIEW</span>
          </div>

          {elevation.tokens.map((t, i) => <TokenCard key={i} level={t} index={i} shadow={elevation.shadow} />)}

          <button type="button" onClick={addElevation} className="h-11 rounded-xl border border-dashed border-[#D4D4D8] bg-transparent text-[13px] text-[#3F3F46]">+ Add level</button>

          <div className="relative mt-2 rounded-[10px] bg-ink px-4 py-3.5">
            <button type="button" onClick={copyCss} className="absolute right-3 top-3 h-8 rounded-md border border-[#3F3F46] bg-transparent px-2.5 text-xs text-line">{copied ? 'Copied' : copyFailed ? 'Copy failed' : 'Copy CSS'}</button>
            <pre aria-label="Elevation CSS" className="m-0 overflow-x-auto whitespace-pre-wrap pr-24 font-mono text-xs leading-[1.7] text-line">{css}</pre>
          </div>
        </div>
      </div>
    </ElevationLayout>
  )
}
