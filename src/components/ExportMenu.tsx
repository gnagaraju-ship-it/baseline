import { useEffect, useRef, useState } from 'react'
import { copyText, downloadText } from '../lib/browser'
import { exportAll } from '../lib/exportAll'
import { buildFigmaTokens, figmaTokenCount, figmaTokensJson } from '../lib/figmaExport'
import { useProject } from '../store/project'
import { Icon } from './Icon'

const item = 'flex w-full items-start gap-2 rounded-md border-0 bg-transparent px-3 py-2 text-left text-[13px] text-ink hover:bg-soft'

/** Rail button that opens a menu to download or copy every module as CSS or as Figma (DTCG) JSON. */
export function ExportMenu() {
  const project = useProject()
  const flashCopied = useProject((s) => s.flashCopied)
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const css = () => exportAll(project)
  const close = () => setOpen(false)

  return (
    <div ref={root} className="relative" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button
        type="button"
        aria-label="Download all modules"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Export all modules"
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-[10px] border border-transparent bg-transparent text-muted hover:bg-soft"
      >
        <Icon name="download" />
      </button>
      {open && (
        <div role="menu" aria-label="Export all modules" className="absolute bottom-0 left-[52px] z-30 w-[270px] rounded-[10px] border border-line bg-surface p-1 shadow-[0_8px_24px_rgba(24,24,27,.12)]">
          <button type="button" role="menuitem" className={item} onClick={() => { downloadText('omni-tokens.css', css().css); close() }}>
            <Icon name="download" size={15} />
            <span><b className="font-semibold">Download CSS</b><span className="block text-[11px] text-muted">omni-tokens.css · {css().count} tokens</span></span>
          </button>
          <button type="button" role="menuitem" className={item} onClick={() => { downloadText('omni-tokens.json', figmaTokensJson(project), 'application/json'); close() }}>
            <Icon name="download" size={15} />
            <span><b className="font-semibold">Download Figma JSON</b><span className="block text-[11px] text-muted">omni-tokens.json · W3C design tokens · {figmaTokenCount(buildFigmaTokens(project))} tokens</span></span>
          </button>
          <button type="button" role="menuitem" className={item} onClick={async () => { flashCopied(await copyText(figmaTokensJson(project))); close() }}>
            <Icon name="copy" size={15} />
            <span><b className="font-semibold">Copy Figma JSON</b><span className="block text-[11px] text-muted">Paste into Tokens Studio or a file</span></span>
          </button>
        </div>
      )}
    </div>
  )
}
