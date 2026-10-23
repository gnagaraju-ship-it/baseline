import { checklist, detailText, type GridColour } from '../../lib/contrastGrid'
import type { Standard } from '../../lib/contrast'

interface Props {
  standard: Standard
  text: GridColour
  bg: GridColour
  score: number
}

export function DetailCard({ standard, text, bg, score }: Props) {
  return (
    <div aria-live="polite" aria-label="Selected pair" className="flex flex-col gap-3 rounded-xl bg-ink p-3.5 text-[#FAFAFA]">
      <div className="flex justify-between text-[13px]">
        <span className="font-semibold">{text.label} on {bg.label}</span>
        <span className="font-mono text-[#D4D4D8]">{detailText(standard, score)}</span>
      </div>
      <div className="rounded-lg p-3 text-[15px] font-medium" style={{ background: `#${bg.hex}`, color: `#${text.hex}` }}>Sample text preview</div>
      {checklist(standard, score).map((k) => (
        <div key={k.label} className="flex items-center gap-2 text-xs">
          <span aria-hidden="true" className="w-3.5 font-bold" style={{ color: k.ok ? '#4ADE80' : '#F87171' }}>{k.ok ? '✓' : '✕'}</span>
          <span className={`flex-1 ${k.ok ? 'text-[#FAFAFA]' : 'text-[#A1A1AA] line-through'}`}>
            {k.label}
            <span className="sr-only">{k.ok ? ' — passes' : ' — fails'}</span>
          </span>
          <span className="rounded bg-[#27272A] px-1.5 py-0.5 font-mono text-[10px]" style={{ color: k.ok ? '#4ADE80' : '#F87171' }}>{k.need}</span>
        </div>
      ))}
    </div>
  )
}
