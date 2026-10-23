import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { AppShell } from '../components/AppShell'

export function NotFoundPage() {
  return (
    <AppShell
      panel={
        <div className="flex items-center gap-3 px-5 py-4">
          <Logo size={32} />
          <div className="text-base font-semibold">Baseline</div>
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
