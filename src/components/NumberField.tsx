import { useState } from 'react'

interface Props {
  id: string
  value: number
  step?: number
  min?: number
  max?: number
  className?: string
  /** Accessible name when there is no visible label. */
  ariaLabel?: string
  /** Borderless field for use inside a styled wrapper. */
  bare?: boolean
  /** Called with a valid number, or null when the field is emptied or not a number. */
  onCommit: (n: number | null) => void
}

/** Number input that keeps what the user is typing and commits every valid value as they go. */
export function NumberField({ id, value, step = 1, min, max, className = '', ariaLabel, bare = false, onCommit }: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <input
      id={id}
      aria-label={ariaLabel}
      type="number"
      step={step}
      min={min}
      max={max}
      value={draft ?? String(value)}
      onChange={(e) => {
        setDraft(e.target.value)
        const n = parseFloat(e.target.value)
        onCommit(Number.isNaN(n) ? null : n)
      }}
      onBlur={() => setDraft(null)}
      className={bare ? `w-full min-w-0 border-0 bg-transparent text-right font-mono text-[13px] text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none ${className}` : `inp font-mono ${className}`}
    />
  )
}
