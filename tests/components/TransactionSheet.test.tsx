import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import TransactionSheet from '../../src/components/TransactionSheet'
import type { Transaction } from '../../src/types'

const mockTx: Transaction = {
  id: 't1',
  user_id: 'u1',
  title: 'Salário',
  amount: 5000,
  type: 'income',
  date: '2026-05-01',
  notes: null,
  category_id: 'c1',
  created_at: '',
  categories: { id: 'c1', user_id: 'u1', name: 'Receita', type: 'income', color: '#22c55e', created_at: '' },
}

describe('TransactionSheet', () => {
  it('não renderiza nada quando transaction é null', () => {
    const { container } = render(
      <TransactionSheet transaction={null} onClose={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('exibe título, valor e categoria da transação', () => {
    render(
      <TransactionSheet transaction={mockTx} onClose={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />
    )
    expect(screen.getByText('Salário')).toBeInTheDocument()
    expect(screen.getAllByText('Receita')).toHaveLength(2)
  })

  it('chama onClose ao clicar no overlay', () => {
    const onClose = vi.fn()
    render(
      <TransactionSheet transaction={mockTx} onClose={onClose} onEdit={vi.fn()} onDelete={vi.fn()} />
    )
    fireEvent.click(screen.getByRole('dialog').previousElementSibling!)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('chama onDelete e onClose após confirmação de exclusão', () => {
    const onDelete = vi.fn()
    const onClose = vi.fn()
    render(
      <TransactionSheet transaction={mockTx} onClose={onClose} onEdit={vi.fn()} onDelete={onDelete} />
    )
    // first click shows confirmation
    fireEvent.click(screen.getByText(/Excluir/))
    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getByText('Sim')).toBeInTheDocument()
    // second click (confirm) calls onDelete and onClose
    fireEvent.click(screen.getByText('Sim'))
    expect(onDelete).toHaveBeenCalledWith('t1')
    expect(onClose).toHaveBeenCalledOnce()
  })
})
