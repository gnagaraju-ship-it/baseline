import { useMemo, useState } from 'react'
import { activeView, computeGroups, countRows, isWeb, toTypeCss, typeFonts, withGridBreakpoints, type ViewKey } from '../../lib/typeScale'
import { useProject } from '../../store/project'
import { PreviewView } from './PreviewView'
import { ScaleView } from './ScaleView'
import { TypeLayout, type TypeTab } from './TypeLayout'

const VIEWS: Array<[ViewKey, string]> = [['desktop', 'Desktop'], ['tablet', 'Tablet'], ['mobile', 'Mobile']]

export function TypePage() {
  const openExport = useProject((s) => s.openExport)
  const [tab, setTab] = useState<TypeTab>('scale')
  const rawType = useProject((s) => s.type)
  const gridOn = useProject((s) => s.grid.on)
  const type = useMemo(() => withGridBreakpoints(rawType, gridOn.md, gridOn.xs), [rawType, gridOn.md, gridOn.xs])
  const setTypeView = useProject((s) => s.setTypeView)
  const web = isWeb(type.platform)
  const groups = useMemo(() => computeGroups(type), [type])
  const count = countRows(groups)
  const css = toTypeCss(groups, web, typeFonts(type))
  const views = VIEWS.filter(([k]) => k === 'desktop' || (k === 'tablet' ? type.tablet.on : type.mobile.on))
  const current = activeView(type)

  return (
    <TypeLayout css={css} tab={tab} onTab={setTab} count={count} onExport={() => openExport(['type'])}>
      <div className="flex flex-col gap-6 px-7 pb-14 pt-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-[560px]">
            <h1 className="m-0 mb-1.5 text-[22px] font-semibold tracking-[-0.01em]">Type Scale</h1>
            <p className="m-0 text-sm leading-[1.55] text-muted">Click any step to add weight variants or override line height and letter spacing.</p>
          </div>
          {web && views.length > 1 && (
            <div role="group" aria-label="Breakpoint" className="inline-flex gap-0.5 rounded-[9px] bg-line-faint p-[3px]">
              {views.map(([k, label]) => (
                <button key={k} type="button" aria-pressed={current === k} onClick={() => setTypeView(k)} className={`h-8 rounded-[7px] border-0 px-3.5 text-[13px] font-medium ${current === k ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,.08)]' : 'bg-transparent text-muted'}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {tab === 'scale' && <ScaleView key={type.platform} groups={groups} settings={type} />}
        {tab === 'preview' && <PreviewView groups={groups} settings={type} />}
        {tab === 'export' && <pre aria-label="Type CSS" className="m-0 overflow-x-auto whitespace-pre-wrap rounded-xl bg-night px-5 py-[18px] font-mono text-[12.5px] leading-[1.7] text-code">{css}</pre>}
      </div>
    </TypeLayout>
  )
}
