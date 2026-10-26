import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Icon } from '../../components/Icon'
import { NumberField } from '../../components/NumberField'
import { Logo } from '../../components/Logo'
import { ThemeMenu } from '../../components/ThemeMenu'
import { TopBar, type ViewTab } from '../../components/TopBar'
import { copyText } from '../../lib/browser'
import type { ExportModule } from '../../lib/exportAll'
import { byModule, cssName, importedCount, importedSections, resolveSet, type ImportedCollection } from '../../lib/importedTokens'
import { useProject } from '../../store/project'

const TABS: Record<string, { module: ExportModule; label: string }> = {
  '/spacing': { module: 'spacing', label: 'Spacing and radius' },
  '/elevation': { module: 'elevation', label: 'Elevation' }
}

/** The screens an imported set still has to itself: the colour screens use the theme's colour schema. */
export const IMPORTED_ROUTES = ['/elevation']

export function NameField({ collection, name }: { collection: string; name: string }) {
  const rename = useProject((s) => s.renameImportedVariable)
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    if (draft !== null) rename(collection, name, draft)
    setDraft(null)
  }
  return (
    <input
      type="text"
      aria-label={`${name} name`}
      value={draft ?? name}
      title={cssName(name)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setDraft(null); e.currentTarget.blur() } }}
      className="-ml-1 min-w-0 rounded border border-transparent bg-transparent px-1 font-mono text-xs text-ink hover:border-line focus:border-line"
    />
  )
}

function CollectionTable({ collection, resolved }: { collection: ImportedCollection; resolved: ImportedCollection }) {
  const { setImportedValue, addImportedVariable, removeImportedVariable, resetImportedCollection } = useProject()
  const cols = `minmax(200px,1.6fr) repeat(${collection.modes.length}, minmax(130px,1fr)) 32px`
  const btn = 'h-8 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink-3'
  return (
    <section aria-label={collection.name} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h3 className="m-0 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.08em] text-muted">
          {collection.name}
          <span className="rounded-md bg-soft px-1.5 py-px font-mono text-[11px] normal-case tracking-normal">{collection.variables.length}</span>
        </h3>
        <span className="flex-1" />
        <button type="button" onClick={() => addImportedVariable(collection.name)} className={btn}>+ Add</button>
        <button type="button" onClick={() => resetImportedCollection(collection.name)} className={btn}>Reset {collection.name}</button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line">
        <div className="min-w-[560px]">
          <div className="grid gap-3 border-b border-line bg-panel px-3 py-2 text-[11px] font-semibold tracking-[.06em] text-muted" style={{ gridTemplateColumns: cols }}>
            <span>VARIABLE</span>
            {collection.modes.map((m) => <span key={m}>{m.toUpperCase()}</span>)}
            <span />
          </div>
          {collection.variables.map((v, i) => (
            <div key={v.name} className="grid items-center gap-3 border-b border-line-soft px-3 py-1.5 last:border-b-0" style={{ gridTemplateColumns: cols }}>
              <NameField collection={collection.name} name={v.name} />
              {collection.modes.map((m) => {
                const value = resolved.variables[i].values[m]
                return (
                  <span key={m} className="flex min-w-0 items-center gap-1.5">
                    {value ? (
                      <>
                        <NumberField id={`${collection.name}-${v.name}-${m}`} ariaLabel={`${v.name} ${m}`} value={Number(value.v)} min={0} className="h-8 w-20 px-1.5 text-right" onCommit={(n) => n !== null && setImportedValue(collection.name, v.name, m, n)} />
                        <span className="text-xs text-muted">px</span>
                        {v.values[m]?.a && <span title={`Follows ${v.values[m].a!.split('::')[1]}`} className="truncate rounded bg-soft px-1.5 py-px font-mono text-[10px] text-muted">→ {v.values[m].a!.split('::')[1]}</span>}
                      </>
                    ) : <span className="text-muted">-</span>}
                  </span>
                )
              })}
              <button type="button" aria-label={`Remove ${v.name}`} onClick={() => removeImportedVariable(collection.name, v.name)} className="flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent text-muted hover:bg-soft">
                <Icon name="close" size={13} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/** The editable tables of one module's named tokens (spacing and radius, or widths and containers). */
export function NamedTokenTables({ module }: { module: ExportModule }) {
  const set = useProject((s) => s.imported)
  if (!set) return null
  const groups = byModule(set)[module]
  const resolved = byModule(resolveSet(set))[module]
  return <>{groups.map((c, i) => <CollectionTable key={c.name} collection={c} resolved={resolved[i]} />)}</>
}

/** Spacing, radius, widths and containers of a theme that keeps them as imported: named tokens you can edit. */
export function ImportedPage() {
  const { pathname } = useLocation()
  const set = useProject((s) => s.imported)!
  const themeName = useProject((s) => s.themes.find((t) => t.id === s.activeThemeId)?.name ?? '')
  const { openExport, flashCopied, copied, copyFailed } = useProject()
  const groups = byModule(set)
  const resolvedGroups = byModule(resolveSet(set))
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
            <div className="flex-1 text-base font-semibold">Spacing and sizes</div>
            <ThemeMenu variant="chip" />
          </div>
          <div className="flex flex-col gap-4 p-5 text-[13px] leading-[1.5] text-ink-3">
            <p className="m-0">The theme <b className="text-ink">{themeName}</b> has {importedCount(set)} named tokens for spacing, radius, widths and containers, as they came from the Untitled files. Edit a value, rename a token, add or remove one. Tokens that point at another follow it until you give them a value of their own.</p>
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
          groups[tab.module].map((c, i) => <CollectionTable key={c.name} collection={c} resolved={resolvedGroups[tab.module][i]} />)
        )}
      </div>
    </AppShell>
  )
}
