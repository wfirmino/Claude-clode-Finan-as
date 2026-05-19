import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Reports from '../../src/pages/Reports'

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn(),
  },
}))

vi.mock('../../src/utils/csv', () => ({
  exportTransactionsToCSV: vi.fn(),
  buildCSVContent: vi.fn(),
}))

import { supabase } from '../../src/lib/supabase'
import { exportTransactionsToCSV } from '../../src/utils/csv'

const currentMonth = new Date().toISOString().split('T')[0].slice(0, 7)

const mockTransactions = [
  { id: 't1', user_id: 'u1', category_id: 'c1', title: 'Salário', amount: 5000, type: 'income', date: `${currentMonth}-01`, notes: null, created_at: '', categories: { id: 'c1', user_id: 'u1', name: 'Trabalho', type: 'income', color: '#22c55e', created_at: '' } },
  { id: 't2', user_id: 'u1', category_id: 'c2', title: 'Mercado', amount: 300, type: 'expense', date: `${currentMonth}-05`, notes: null, created_at: '', categories: { id: 'c2', user_id: 'u1', name: 'Alimentação', type: 'expense', color: '#ef4444', created_at: '' } },
]

function mockFrom(data: object[]) {
  const resolved = { data, error: null }
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    // make the chain awaitable so filter chaining works
    then: (resolve: (v: unknown) => void) => Promise.resolve(resolved).then(resolve),
    catch: (reject: (e: unknown) => void) => Promise.resolve(resolved).catch(reject),
  }
  vi.mocked(supabase.from).mockReturnValue(chain as any)
  return chain
}

describe('Reports page', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders totals for income and expense', async () => {
    mockFrom(mockTransactions)
    render(<MemoryRouter><Reports /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText(/total de receitas/i)).toBeInTheDocument()
      expect(screen.getByText(/total de despesas/i)).toBeInTheDocument()
    })
  })

  it('renders transactions in the table', async () => {
    mockFrom(mockTransactions)
    render(<MemoryRouter><Reports /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Salário')).toBeInTheDocument()
      expect(screen.getByText('Mercado')).toBeInTheDocument()
    })
  })

  it('calls exportTransactionsToCSV with current transactions when button is clicked', async () => {
    mockFrom(mockTransactions)
    render(<MemoryRouter><Reports /></MemoryRouter>)
    await waitFor(() => screen.getByText('Salário'))
    fireEvent.click(screen.getByRole('button', { name: /exportar csv/i }))
    expect(exportTransactionsToCSV).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ title: 'Salário' }),
      expect.objectContaining({ title: 'Mercado' }),
    ]))
  })

  it('switches to quarter period when "Trimestre" is clicked', async () => {
    mockFrom(mockTransactions)
    render(<MemoryRouter><Reports /></MemoryRouter>)
    await waitFor(() => screen.getByText('Salário'))
    fireEvent.click(screen.getByRole('button', { name: /trimestre/i }))
    expect(screen.getByRole('button', { name: /trimestre/i })).toHaveClass('bg-indigo-600')
  })

  it('shows custom date inputs when "Personalizado" is clicked', async () => {
    mockFrom(mockTransactions)
    render(<MemoryRouter><Reports /></MemoryRouter>)
    await waitFor(() => screen.getByText('Salário'))
    fireEvent.click(screen.getByRole('button', { name: /personalizado/i }))
    const dateInputs = document.querySelectorAll('input[type="date"]')
    expect(dateInputs.length).toBe(2)
  })

  it('shows empty state when there are no transactions', async () => {
    mockFrom([])
    render(<MemoryRouter><Reports /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText(/nenhuma transação no período/i)).toBeInTheDocument()
    })
  })
})
