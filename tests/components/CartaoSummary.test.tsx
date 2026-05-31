import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import CartaoSummary from '../../src/components/CartaoSummary'
import type { Transaction } from '../../src/types'

const makeExpense = (amount: number): Transaction => ({
  id: Math.random().toString(), user_id: 'u1', category_id: null,
  title: 'Compra', amount, type: 'expense', date: '2026-05-10',
  notes: null, created_at: '', perfil: 'cartao', card_id: 'c1',
})
const makePayment = (amount: number): Transaction => ({
  id: Math.random().toString(), user_id: 'u1', category_id: null,
  title: 'Pagamento', amount, type: 'income', date: '2026-05-10',
  notes: null, created_at: '', perfil: 'cartao', card_id: 'c1',
})

describe('CartaoSummary', () => {
  it('renders fatura, pago and em aberto cards', () => {
    const txs = [makeExpense(1000), makeExpense(500), makePayment(800)]
    render(<CartaoSummary transactions={txs} dueDay={10} periodo="Maio 2026" />)
    expect(screen.getByText(/FATURA/i)).toBeInTheDocument()
    expect(screen.getByText(/PAGO/i)).toBeInTheDocument()
    expect(screen.getByText(/ABERTO/i)).toBeInTheDocument()
  })

  it('calculates fatura = sum of expenses', () => {
    const txs = [makeExpense(1000), makeExpense(500)]
    render(<CartaoSummary transactions={txs} dueDay={10} periodo="Maio 2026" />)
    expect(screen.getByText('R$ 1.500,00')).toBeInTheDocument()
  })

  it('calculates em aberto = fatura - pago', () => {
    const txs = [makeExpense(1000), makePayment(600)]
    render(<CartaoSummary transactions={txs} dueDay={10} periodo="Maio 2026" />)
    // fatura=1000, pago=600, aberto=400
    expect(screen.getByText('R$ 400,00')).toBeInTheDocument()
  })

  it('shows 100% pago when fully paid', () => {
    const txs = [makeExpense(500), makePayment(500)]
    render(<CartaoSummary transactions={txs} dueDay={10} periodo="Maio 2026" />)
    expect(screen.getByText('100% pago')).toBeInTheDocument()
  })
})
