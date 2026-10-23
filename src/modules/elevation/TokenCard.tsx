import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { NumberField } from '../../components/NumberField'
import { sanitiseName, shadowCss, type LayerField, type Level } from '../../lib/elevation'
import { useProject } from '../../store/project'

const FIELDS: Array<[LayerField, string, string]> = [['x', 'px', 'X offset'], ['y', 'px', 'Y offset'], ['blur', 'px', 'Blur'], ['spread', 'px', 'Spread'], ['op', '%', 'Colour opacity']]
const ROW = 'grid grid-cols-[minmax(0,1fr)_repeat(5,minmax(76px,.8fr))] gap-2.5'

function NameField({ id, value, onCommit }: { id: string; value: string; onCommit: (text: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <input
      id={id}
      type="text"
      value={draft ?? value}
      spellCheck={false}
      onChange={(e) => {
        setDraft(e.target.value)
        if (sanitiseName(e.target.value)) onCommit(e.target.value)
      }}
      onBlur={() => setDraft(null)}
      className="min-w-0 flex-1 border-0 bg-transparent font-mono text-[13px] font-semibold outline-none"
    />
  )
}

export function TokenCard({ level, index, shadow }: { level: Level; index: number; shadow: string }) {
  const { renameElevation, removeElevation, addElevationLayer, removeElevationLayer, setElevationField } = useProject()
  const full = `elevation-${level.name}`

  return (
    <section aria-label={full} className="grid grid-cols-[40px_minmax(200px,2.2fr)_minmax(0,5fr)_120px] items-stretch rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-center border-r border-line-faint">
        <button type="button" onClick={() => removeElevation(index)} aria-label={`Delete ${full}`} className="flex h-8 w-8 items-center justify-center rounded-[7px] border-0 bg-transparent text-muted hover:bg-soft">
          <Icon name="trash" size={15} strokeWidth={1.6} />
        </button>
      </div>
      <div className="flex flex-col gap-2.5 border-r border-line-faint px-3 py-3.5">
        <div className="flex h-[34px] items-center rounded-[7px] bg-soft px-2.5 font-mono text-[13px]">
          <label htmlFor={`tok-${index}`} className="text-muted">elevation-</label>
          <NameField id={`tok-${index}`} value={level.name} onCommit={(t) => renameElevation(index, t)} />
        </div>
        <button type="button" onClick={() => addElevationLayer(index)} className="h-[30px] self-start rounded-[7px] border border-line bg-surface px-2.5 text-xs text-ink-3">+ Layer</button>
      </div>
      <div className="flex flex-col">
        {level.layers.map((l, j) => (
          <div key={j} className={`${ROW} flex-1 items-center border-b border-line-faint px-3 py-3.5`}>
            <span className="flex items-center gap-1.5 font-mono text-xs text-muted">
              Layer {j + 1}
              {level.layers.length > 1 && (
                <button type="button" onClick={() => removeElevationLayer(index, j)} aria-label={`Remove ${full} layer ${j + 1}`} className="h-6 w-6 rounded-[5px] border-0 bg-soft text-sm leading-none text-muted">×</button>
              )}
            </span>
            {FIELDS.map(([field, unit, aria]) => (
              <div key={field} className="flex h-[34px] items-center gap-1 rounded-[7px] bg-soft px-2 focus-within:shadow-[0_0_0_2px_#C2410C]">
                <NumberField
                  id={`${full}-${j}-${field}`}
                  ariaLabel={`${full} layer ${j + 1} ${aria}`}
                  value={l[field]}
                  bare
                  onCommit={(n) => setElevationField(index, j, field, String(n ?? 0))}
                />
                <span className="text-[10px] text-subtle">{unit}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center rounded-r-xl border-l border-line-faint bg-panel p-[18px]">
        <div aria-hidden="true" data-testid={`preview-${level.name}`} className="h-14 w-14 rounded-[10px] bg-surface" style={{ boxShadow: shadowCss(level.layers, shadow) }} />
      </div>
    </section>
  )
}
