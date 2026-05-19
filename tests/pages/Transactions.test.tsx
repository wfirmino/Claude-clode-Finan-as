import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Transactions from '../../src/pages/Transactions'

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

const mockTransactions = [
  { id: 't1', user_id: 'u1', category_id: 'c1', title: 'Salário', amount: 5000, type: 'income', date: '2026-05-01', notes: null, created_at: '', categories: { id: 'c1', user_id: 'u1', name: 'Trabalho', type: 'income', color: '#22c55e', created_at: '' } },
  { id: 't2', user_id: 'u1', category_id: 'c2', title: 'Mercado', amount: 300, type: 'expense', date: '2026-05-05', notes: null, created_at: '', categories: { id: 'c2', user_id: 'u1', name: 'Alimentação', type: 'expense', color: '#ef4444', created_at: '' } },
]

const mockCategories = [
  { id: 'c1', user_id: 'u1', name: 'Trabalho', type: 'income', color: '#22c55e', created_at: '' },
  { id: 'c2', user_id: 'u1', name: 'Alimentação', type: 'expense', color: '#ef4444', created_at: '' },
]

function mockFrom(table: string) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: table === 'categories' ? mockCategories : mockTransactions,
      error: null,
    }),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  }
  return chain
}

describe('Transactions page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabase.from).mockImplementation((table: string) => mockFrom(table) as any)
  })

  it('renders transactions in table', async () => {
    render(<MemoryRouter><Transactions /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Salário')).toBeInTheDocument()
      expect(screen.getByText('Mercado')).toBeInTheDocument()
    })
  })

  it('opens modal when "Nova Transação" is clicked', async () => {
    render(<MemoryRouter><Transactions /></MemoryRouter>)
    await waitFor(() => screen.getByText('Salário'))
    fireEvent.click(screen.getByRole('button', { name: /nova transação/i }))
    expect(screen.getByRole('heading', { name: /nova transação/i })).toBeInTheDocument()
  })
})
