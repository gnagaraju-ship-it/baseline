import { norm } from '../lib/colour'
import { Icon } from './Icon'

interface Props {
  id: string
  label: string
  /** Raw text as typed. */
  value: string
  fallback: string
  onChange: (value: string) => void
  /** Message shown under the field when the text is not a valid hex. */
  invalidMessage?: string
  onRemove?: () => void
  /** When given, the label becomes an editable name. */
  onRename?: (name: string) => void
}

export function ColourField({ id, label, value, fallback, onChange, invalidMessage = 'Enter six hex digits.', onRemove, onRename }: Props) {
  const valid = norm(value) !== null
  const picker = '#' + (norm(value) ?? fallback).toLowerCase()
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        {onRename ? (
          <input type="text" aria-label={`${label} name`} value={label} maxLength={24} onChange={(e) => onRename(e.target.value)} className="-ml-1 w-40 rounded border border-transparent bg-transparent px-1 text-[13px] font-medium text-ink-2 hover:border-line focus:border-line" />
        ) : (
          <label htmlFor={id} className="text-[13px] font-medium text-ink-2">{label}</label>
        )}
        <span className="flex items-center gap-1 text-[11px] font-semibold tracking-[.04em] text-muted"><Icon name="updown" size={10} strokeWidth={2.2} />HEX</span>
      </div>
      <div className={`field flex h-11 items-center gap-2.5 rounded-[10px] border bg-surface px-1.5 ${valid ? 'border-line' : 'border-danger'}`}>
        <input className="chip-input" type="color" value={picker} onChange={(e) => onChange(e.target.value.toUpperCase())} aria-label={`${label} colour picker`} />
        <input id={id} className="hexin min-w-0 flex-1 border-0 bg-transparent font-mono text-[13px] text-ink" type="text" value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} aria-invalid={!valid} aria-label={onRename ? `${label} hex` : undefined} />
        {onRemove && (
          <button type="button" aria-label={`Remove ${label}`} onClick={onRemove} className="mr-1 h-8 rounded-md border-0 bg-transparent px-2 text-[13px] text-muted hover:bg-soft">Remove</button>
        )}
      </div>
      {!valid && <div className="text-xs text-danger">{invalidMessage}</div>}
    </div>
  )
}
