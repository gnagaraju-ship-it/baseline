import type { Palette } from '../../lib/colour'
import { grade, wcagRatio } from '../../lib/contrast'
import { useProject } from '../../store/project'
import { useSchema } from '../colour/useSchema'

function tone(r: number): string {
  return r >= 4.5 ? 'var(--color-ok)' : r >= 3 ? 'var(--color-mid)' : 'var(--color-bad)'
}

function Chip({ dot, ringed, label, ratio }: { dot: string; ringed?: boolean; label: string; ratio: number }) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: dot, boxShadow: ringed ? 'inset 0 0 0 1px #A1A1AA' : undefined }} />
      {label} <b className="font-semibold">{ratio.toFixed(2)}:1</b>
      <span className="font-semibold" style={{ color: tone(ratio) }}>{grade(ratio)}</span>
    </span>
  )
}

export function SelectionStrip({ palettes }: { palettes: Palette[] }) {
  const selected = useProject((s) => s.selected)
  const { colour } = useSchema()
  const palette = palettes.find((p) => p.key === selected.key) ?? palettes[0]
  const index = palettes.some((p) => p.key === selected.key) ? selected.index : palette.base - 1
  const hexColour = palette.steps[index]
  const stepLabel = palette.labels?.[index] ?? colour?.steps[index] ?? String(index + 1)
  const onWhite = wcagRatio(hexColour, 'FFFFFF')
  const onBlack = wcagRatio(hexColour, '000000')

  return (
    <div aria-live="polite" className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line-faint bg-panel px-7 py-3.5">
      <div className="flex items-center gap-2.5">
        <span className="h-7 w-7 rounded-[7px] shadow-[inset_0_0_0_1px_rgba(0,0,0,.08)]" style={{ background: `#${hexColour}` }} />
        <div className="font-semibold">{palette.name} {stepLabel}</div>
        <div className="font-mono text-[13px] text-muted">#{hexColour}</div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <Chip dot="#FFFFFF" ringed label="On white" ratio={onWhite} />
        <Chip dot="#09090B" ringed label="On black" ratio={onBlack} />
      </div>
      <div className="ml-auto text-xs text-muted">Click any swatch to inspect it</div>
    </div>
  )
}
