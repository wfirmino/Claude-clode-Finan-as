import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '../../src/pages/Dashboard'

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn(),
  },
}))

import { supabase } from '../../src/lib/supabase'

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
    then: (resolve: (v: unknown) => void) => Promise.resolve(resolved).then(resolve),
    catch: (reject: (e: unknown) => void) => Promise.resolve(resolved).catch(reject),
  }
  vi.mocked(supabase.from).mockReturnValue(chain as any)
  return chain
}

describe('Dashboard page', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders summary cards with balance, income and expense', async () => {
    mockFrom(mockTransactions)
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText(/saldo atual/i)).toBeInTheDocument()
      expect(screen.getByText(/receitas do mês/i)).toBeInTheDocument()
      expect(screen.getByText(/despesas do mês/i)).toBeInTheDocument()
    })
  })

  it('renders recent transactions section', async () => {
    mockFrom(mockTransactions)
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Salário')).toBeInTheDocument()
      expect(screen.getByText('Mercado')).toBeInTheDocument()
    })
  })

  it('shows "Nenhuma transação" when there are no transactions', async () => {
    mockFrom([])
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText(/nenhuma transação registrada/i)).toBeInTheDocument()
    })
  })

  it('renders the "Ver todas" link pointing to /transactions', async () => {
    mockFrom(mockTransactions)
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /ver todas/i })
      expect(link).toHaveAttribute('href', '/transactions')
    })
  })
})
