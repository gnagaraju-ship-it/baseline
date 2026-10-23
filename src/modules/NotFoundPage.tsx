import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'

export function NotFoundPage() {
  return (
    <AppShell
      panel={
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink"><span className="h-3 w-3 rounded-[3px] bg-[#FF5A1F]" /></div>
          <div className="text-base font-semibold">Omni by Canvs</div>
        </div>
      }
    >
      <div className="flex flex-1 items-center justify-center p-10 text-center">
        <div className="max-w-md">
          <h1 className="m-0 mb-2 text-[22px] font-semibold tracking-[-0.01em]">Page not found</h1>
          <p className="m-0 text-sm leading-relaxed text-muted">There is no screen at this address. <Link to="/">Go to Palette</Link> or pick a module from the rail.</p>
        </div>
      </div>
    </AppShell>
  )
}
