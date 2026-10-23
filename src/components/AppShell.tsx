import type { ReactNode } from 'react'
import { Rail } from './Rail'

interface Props {
  /** Content of the 320px settings panel next to the rail. */
  panel: ReactNode
  children: ReactNode
}

/** 64px icon rail + 320px settings panel + fluid main area; wraps on narrow screens. */
export function AppShell({ panel, children }: Props) {
  return (
    <div className="flex min-h-screen flex-wrap bg-ground text-sm text-ink">
      <div className="flex max-w-full flex-[1_1_384px] border-r border-line-soft bg-panel">
        <Rail />
        <aside aria-label="Settings" className="flex min-w-0 flex-[1_1_auto] flex-col">
          {panel}
        </aside>
      </div>
      <main className="flex min-w-0 flex-[999_1_560px] flex-col bg-ground">{children}</main>
    </div>
  )
}
