import { copyText } from '../../lib/browser'
import { toCss } from '../../lib/colour'
import { useProject } from '../../store/project'
import { ColourLayout } from '../colour/ColourLayout'
import { usePalettes } from '../colour/usePalettes'
import { RampCard } from './RampCard'
import { SelectionStrip } from './SelectionStrip'

export function PalettePage() {
  const openExport = useProject((s) => s.openExport)
  const { palettes, rows } = usePalettes()
  const flashCopied = useProject((s) => s.flashCopied)

  async function copyAll() {
    flashCopied(await copyText(toCss(rows)))
  }

  return (
    <ColourLayout current="/" exportCount={rows.length} onCopyAll={copyAll} onExport={() => openExport(['ramps'])}>
      <SelectionStrip palettes={palettes} />
      <div id="palette" className="flex flex-col gap-5 px-7 pb-12 pt-6">
        {palettes.map((p) => <RampCard key={p.key} palette={p} />)}
      </div>
    </ColourLayout>
  )
}
