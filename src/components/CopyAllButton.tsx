import { copyText } from '../lib/browser'
import { useProject } from '../store/project'
import { Icon } from './Icon'

/** "Copy all" for the current module's CSS, with the shared "Copied" flash. */
export function CopyAllButton({ css }: { css: string }) {
  const copied = useProject((s) => s.copied)
  const failed = useProject((s) => s.copyFailed)
  const flashCopied = useProject((s) => s.flashCopied)
  return (
    <button
      type="button"
      onClick={async () => {
        flashCopied(await copyText(css))
      }}
      className="flex h-10 items-center gap-2 rounded-[9px] border border-line bg-white px-3.5 text-[13px] font-medium text-ink"
    >
      <Icon name="copy" size={15} strokeWidth={1.7} />
      {copied ? 'Copied' : failed ? 'Copy failed' : 'Copy all'}
    </button>
  )
}
