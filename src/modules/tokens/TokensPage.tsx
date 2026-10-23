import { copyText, downloadText } from '../../lib/browser'
import { GROUP_TITLES, toTokenCss, type TokenGroup } from '../../lib/tokens'
import { useProject } from '../../store/project'
import { ColourLayout } from '../colour/ColourLayout'
import { useResolvedTokens } from '../colour/useResolvedTokens'
import { TokenRow } from './TokenRow'

const GROUPS: TokenGroup[] = ['bg', 'text', 'border']
const NAMES: Record<string, string> = { primary: 'Primary', secondary: 'Secondary', neutral: 'Neutral', info: 'Info', success: 'Success', caution: 'Caution', warning: 'Warning', critical: 'Critical' }

export function TokensPage() {
  const { palettes, tokens, resolvedCount, missing } = useResolvedTokens()
  const flashCopied = useProject((s) => s.flashCopied)

  async function copyAll() {
    flashCopied(await copyText(toTokenCss(tokens)))
  }

  return (
    <ColourLayout current="/tokens" exportCount={resolvedCount} onCopyAll={copyAll} onExport={() => downloadText('semantic-tokens.css', toTokenCss(tokens))}>
      <div className="flex flex-col gap-7 px-7 pb-14 pt-5">
        <p className="m-0 text-[13px] text-muted">
          Each token points at a palette step per mode. Click a light or dark value to remap it. Badges show APCA Lc for the best text colour on that token (fills are bold).
        </p>

        {missing.length > 0 && (
          <div role="status" className="rounded-[10px] border border-warn-edge bg-warn-bg px-4 py-3 text-[13px] text-warn-text">
            Some tokens point at palettes that are removed: {missing.map((k) => NAMES[k]).join(', ')}. Add them back in the Brand panel to resolve those tokens; unresolved tokens are left out of the CSS.
          </div>
        )}

        {GROUPS.map((g) => {
          const rows = tokens.filter((t) => t.def.group === g)
          return (
            <section key={g} aria-label={GROUP_TITLES[g]} className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="rounded-[5px] border border-line bg-soft px-1.5 py-0.5 font-mono text-[11px] text-muted">{g}</span>
                <h2 className="m-0 text-base font-semibold">{GROUP_TITLES[g]}</h2>
                <span className="text-xs text-muted">{rows.length}</span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-line">
                <div role="table" aria-label={GROUP_TITLES[g]} className="min-w-[760px]">
                  <div role="row" className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] border-b border-line bg-panel text-[11px] font-semibold tracking-[.08em] text-muted">
                    <div role="columnheader" className="px-4 py-2.5">TOKEN</div>
                    <div role="columnheader" className="px-4 py-2.5">LIGHT</div>
                    <div role="columnheader" className="px-4 py-2.5">DARK</div>
                  </div>
                  {rows.map((t) => <TokenRow key={t.def.name} token={t} palettes={palettes} />)}
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </ColourLayout>
  )
}
