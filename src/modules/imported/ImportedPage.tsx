import { useLocation } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Logo } from '../../components/Logo'
import { ThemeMenu } from '../../components/ThemeMenu'
import { TopBar, type ViewTab } from '../../components/TopBar'
import { copyText } from '../../lib/browser'
import type { ExportModule } from '../../lib/exportAll'
import { byModule, cssName, importedCount, importedSections, type ImportedCollection, type ImportedValue } from '../../lib/importedTokens'
import { useProject } from '../../store/project'

const TABS: Record<string, { module: ExportModule; label: string }> = {
  '/grids': { module: 'grids', label: 'Widths and containers' },
  '/spacing': { module: 'spacing', label: 'Spacing and radius' }
}

/** The screens an imported set still has to itself: the colour screens use the theme's colour schema. */
export const IMPORTED_ROUTES = ['/grids', '/spacing']

function Cell({ value, type }: { value?: ImportedValue; type: string }) {
  if (!value) return <span className="text-muted">-</span>
  return (
    <span className="flex min-w-0 items-center gap-2">
      {type === 'color' && <span aria-hidden className="h-4 w-4 flex-none rounded border border-line" style={{ background: String(value.v) }} />}
      <span className="truncate font-mono text-xs">{type === 'number' ? `${value.v}px` : String(value.v)}</span>
    </span>
  )
}

function CollectionTable({ collection }: { collection: ImportedCollection }) {
  const cols = `minmax(200px,1.6fr) repeat(${collection.modes.length}, minmax(130px,1fr))`
  return (
    <section aria-label={collection.name} className="flex flex-col gap-2">
      <h3 className="m-0 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.08em] text-muted">
        {collection.name}
        <span className="rounded-md bg-soft px-1.5 py-px font-mono text-[11px] normal-case tracking-normal">{collection.variables.length}</span>
      </h3>
      <div className="overflow-x-auto rounded-xl border border-line">
        <div className="min-w-[560px]">
          <div className="grid gap-3 border-b border-line bg-panel px-3 py-2 text-[11px] font-semibold tracking-[.06em] text-muted" style={{ gridTemplateColumns: cols }}>
            <span>VARIABLE</span>
            {collection.modes.map((m) => <span key={m}>{m.toUpperCase()}</span>)}
          </div>
          {collection.variables.map((v) => (
            <div key={v.name} className="grid items-center gap-3 border-b border-line-soft px-3 py-1.5 last:border-b-0" style={{ gridTemplateColumns: cols }}>
              <span className="min-w-0 truncate font-mono text-xs" title={cssName(v.name)}>{v.name}</span>
              {collection.modes.map((m) => <Cell key={m} value={v.values[m]} type={v.type} />)}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Every screen of a theme made of imported tokens: the tokens exactly as imported, read-only. */
export function ImportedPage() {
  const { pathname } = useLocation()
  const set = useProject((s) => s.imported)!
  const themeName = useProject((s) => s.themes.find((t) => t.id === s.activeThemeId)?.name ?? '')
  const { openExport, flashCopied, copied, copyFailed } = useProject()
  const groups = byModule(set)
  const sections = importedSections(set)
  const count = (m: ExportModule) => sections.find((s) => s.id === m)!.count
  const tab = TABS[pathname]

  const shown: ViewTab[] = tab ? [{ to: pathname, label: tab.label, icon: 'tokens', count: count(tab.module) }] : []
  const section = tab ? sections.find((s) => s.id === tab.module)! : null

  return (
    <AppShell
      panel={
        <>
          <div className="flex items-center gap-3 border-b border-line px-5 py-4">
            <Logo size={32} />
            <div className="flex-1 text-base font-semibold">Imported tokens</div>
            <ThemeMenu variant="chip" />
          </div>
          <div className="flex flex-col gap-4 p-5 text-[13px] leading-[1.5] text-ink-3">
            <p className="m-0">The theme <b className="text-ink">{themeName}</b> keeps these {importedCount(set)} tokens exactly as they were imported. They are read-only for now; the colour screens of this theme are fully editable.</p>
            <ul aria-label="Collections" className="m-0 flex list-none flex-col gap-1.5 p-0">
              {set.collections.map((c) => (
                <li key={c.name} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2">
                  <span className="min-w-0 truncate font-mono text-xs">{c.name}</span>
                  <span className="text-xs text-muted">{c.variables.length} · {c.modes.length} {c.modes.length === 1 ? 'mode' : 'modes'}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      }
    >
      {tab ? (
        <TopBar
          tabs={shown}
          current={pathname}
          copyLabel={copied ? 'Copied' : copyFailed ? 'Copy failed' : 'Copy all'}
          exportCount={section!.count}
          onCopyAll={async () => flashCopied(await copyText(section!.css))}
          onExport={() => openExport([tab.module])}
        />
      ) : (
        <div className="flex min-h-16 items-center border-b border-line-soft px-7 font-semibold">Tokens</div>
      )}
      <div className="flex flex-col gap-6 px-7 pb-12 pt-5">
        {!tab ? (
          <p role="status" className="m-0 rounded-[10px] border border-dashed border-edge p-6 text-center text-[13px] text-muted">
            Not available for this theme.
          </p>
        ) : groups[tab.module].length === 0 ? (
          <p role="status" className="m-0 rounded-[10px] border border-dashed border-edge p-6 text-center text-[13px] text-muted">
            This set has no {tab.label.toLowerCase()} tokens.
          </p>
        ) : (
          groups[tab.module].map((c) => <CollectionTable key={c.name} collection={c} />)
        )}
      </div>
    </AppShell>
  )
}
