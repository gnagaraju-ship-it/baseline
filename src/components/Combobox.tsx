import { useId, useState, type CSSProperties, type KeyboardEvent } from 'react'

export interface ComboOption {
  value: string
  label: string
  /** Small tag after the name, e.g. a category. */
  tag?: string
  /** Muted second line, e.g. why it is suggested. */
  hint?: string
  style?: CSSProperties
}

export interface ComboGroup {
  label?: string
  options: ComboOption[]
}

interface Props {
  id: string
  value: string
  disabled?: boolean
  /** Groups to show for the text typed so far ('' = nothing typed). */
  groupsFor: (query: string) => ComboGroup[]
  onSelect: (value: string) => void
  emptyText?: string
}

/** ARIA 1.2 combobox with a filtered, grouped listbox. Only listed values can be selected. */
export function Combobox({ id, value, disabled = false, groupsFor, onSelect, emptyText = 'No matches' }: Props) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState<string | null>(null)
  const [active, setActive] = useState(0)

  const groups = groupsFor(query ?? '').filter((g) => g.options.length > 0)
  const flat = groups.flatMap((g) => g.options)
  const optId = (i: number) => `${listId}-o${i}`

  function close() {
    setOpen(false)
    setQuery(null)
  }

  function pick(v: string) {
    onSelect(v)
    close()
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        setActive(Math.max(0, flat.findIndex((o) => o.value === value)))
        return
      }
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((a) => (flat.length ? (a + step + flat.length) % flat.length : 0))
    } else if (e.key === 'Home' && open) {
      e.preventDefault()
      setActive(0)
    } else if (e.key === 'End' && open) {
      e.preventDefault()
      setActive(Math.max(0, flat.length - 1))
    } else if (e.key === 'Enter' && open) {
      e.preventDefault()
      if (flat[active]) pick(flat[active].value)
    } else if (e.key === 'Escape' && open) {
      e.preventDefault()
      close()
    }
  }

  let index = -1
  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && flat[active] ? optId(active) : undefined}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        value={query ?? value}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={(e) => {
          setOpen(true)
          setActive(Math.max(0, flat.findIndex((o) => o.value === value)))
          e.currentTarget.select()
        }}
        onClick={() => setOpen(true)}
        onBlur={close}
        onKeyDown={onKeyDown}
        className="inp w-full pr-8"
      />
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute right-3 top-3.5 text-muted"><path d="M6 9l6 6 6-6" /></svg>
      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label="Suggestions"
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 right-0 top-[44px] z-20 max-h-72 overflow-y-auto rounded-[10px] border border-line bg-surface py-1 shadow-[0_8px_24px_rgba(24,24,27,.12)]"
        >
          {flat.length === 0 && <div className="px-3 py-2 text-[13px] text-muted">{emptyText}</div>}
          {groups.map((g, gi) => (
            <div key={g.label ?? gi} role="group" aria-label={g.label}>
              {g.label && <div className="px-3 pb-1 pt-2 text-[10px] font-semibold tracking-[.1em] text-muted">{g.label.toUpperCase()}</div>}
              {g.options.map((o) => {
                index += 1
                const i = index
                const selected = o.value === value
                return (
                  <div
                    key={o.value}
                    id={optId(i)}
                    role="option"
                    aria-selected={selected}
                    onClick={() => pick(o.value)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 ${i === active ? 'bg-soft' : ''}`}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className={`truncate text-[15px] ${selected ? 'font-semibold' : ''}`} style={o.style}>{o.label}</span>
                      {o.hint && <span className="text-[11px] text-muted">{o.hint}</span>}
                    </span>
                    {o.tag && <span className="flex-none rounded border border-line px-1.5 py-px text-[10px] text-muted">{o.tag}</span>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
