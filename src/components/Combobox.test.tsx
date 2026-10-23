import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Combobox, type ComboGroup } from './Combobox'

const ALL = ['Alpha', 'Beta', 'Gamma', 'Delta']
const groupsFor = (q: string): ComboGroup[] =>
  q ? [{ options: ALL.filter((n) => n.toLowerCase().includes(q.toLowerCase())).map((n) => ({ value: n, label: n })) }]
    : [{ label: 'Suggested', options: [{ value: 'Gamma', label: 'Gamma', hint: 'Pairs with Alpha', tag: 'Sans' }] }, { label: 'All', options: [{ value: 'Alpha', label: 'Alpha' }, { value: 'Beta', label: 'Beta' }, { value: 'Delta', label: 'Delta' }] }]

function Harness({ onSelect = () => {}, disabled = false }: { onSelect?: (v: string) => void; disabled?: boolean }) {
  const [v, setV] = useState('Alpha')
  return (
    <div>
      <label htmlFor="c">Font</label>
      <Combobox id="c" value={v} disabled={disabled} groupsFor={groupsFor} emptyText="Nothing" onSelect={(x) => { setV(x); onSelect(x) }} />
      <button type="button">outside</button>
    </div>
  )
}

const box = () => screen.getByRole('combobox', { name: 'Font' })

describe('Combobox', () => {
  it('is closed until focused, then shows grouped options with the selected one marked', async () => {
    render(<Harness />)
    expect(box()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    await userEvent.click(box())
    expect(box()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('group', { name: 'Suggested' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Gamma/ })).toHaveTextContent('Pairs with Alpha')
    expect(screen.getByRole('option', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'Beta' })).toHaveAttribute('aria-selected', 'false')
  })

  it('filters as you type and shows the empty text', async () => {
    render(<Harness />)
    await userEvent.click(box())
    await userEvent.keyboard('et')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Beta'])
    await userEvent.clear(box())
    await userEvent.keyboard('zzz')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(within(screen.getByRole('listbox')).getByText('Nothing')).toBeInTheDocument()
  })

  it('selects with the mouse', async () => {
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)
    await userEvent.click(box())
    await userEvent.click(screen.getByRole('option', { name: 'Delta' }))
    expect(onSelect).toHaveBeenCalledWith('Delta')
    expect(box()).toHaveValue('Delta')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('navigates with arrows, Home and End, and selects with Enter', async () => {
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)
    await userEvent.tab()
    expect(box()).toHaveFocus()
    // active starts on the selected value (Alpha, index 1 after the suggestion)
    expect(box()).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Alpha' }).id)
    await userEvent.keyboard('{ArrowDown}')
    expect(box()).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Beta' }).id)
    await userEvent.keyboard('{End}')
    expect(box()).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Delta' }).id)
    await userEvent.keyboard('{ArrowDown}')
    expect(box()).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[0].id)
    await userEvent.keyboard('{Home}{ArrowDown}{Enter}')
    expect(onSelect).toHaveBeenCalledWith('Alpha')
  })

  it('Escape closes and restores the selected value; typed text that is not listed is not selected', async () => {
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)
    await userEvent.click(box())
    await userEvent.keyboard('Comic Sans')
    await userEvent.keyboard('{Enter}')
    expect(onSelect).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(box()).toHaveValue('Alpha')
  })

  it('closes when focus leaves and keeps the old value', async () => {
    render(<Harness />)
    await userEvent.click(box())
    await userEvent.keyboard('Bet')
    await userEvent.click(screen.getByRole('button', { name: 'outside' }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(box()).toHaveValue('Alpha')
  })

  it('cannot be opened when disabled', async () => {
    render(<Harness disabled />)
    expect(box()).toBeDisabled()
    await userEvent.click(box())
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
