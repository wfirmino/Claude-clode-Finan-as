import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Cartao from '../../src/pages/Cartao'

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: vi.fn(),
  },
}))
import { supabase } from '../../src/lib/supabase'

const mockCards = [
  { id: 'c1', user_id: 'u1', name: 'Nubank', due_day: 10, color: '#8b5cf6', created_at: '' },
]
const mockTxs = [
  { id: 't1', user_id: 'u1', category_id: null, title: 'Netflix', amount: 44.9, type: 'expense', date: '2026-05-14', notes: null, created_at: '', perfil: 'cartao', card_id: 'c1' },
]

function mockFrom(table: string) {
  const data = table === 'cards' ? mockCards : mockTxs
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    then: (r: (v: unknown) => void) => {
      return Promise.resolve({ data, error: null, count: data.length }).then(r)
    },
  }
  return chain
}

describe('Cartao page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabase.from).mockImplementation((table: string) => mockFrom(table) as any)
  })

  it('shows empty state when no cards', async () => {
    vi.mocked(supabase.from).mockImplementation(() => {
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: (r: (v: unknown) => void) => Promise.resolve({ data: [], error: null, count: 0 }).then(r),
      }
      return chain as any
    })
    render(<MemoryRouter><Cartao /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/Nenhum cartão cadastrado/i)).toBeInTheDocument())
  })

  it('shows card tab and transactions when cards exist', async () => {
    render(<MemoryRouter><Cartao /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Nubank')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText('Netflix')).toBeInTheDocument())
  })

  it('opens new card modal on click', async () => {
    render(<MemoryRouter><Cartao /></MemoryRouter>)
    await waitFor(() => screen.getByText('Nubank'))
    fireEvent.click(screen.getByRole('button', { name: /novo cartão/i }))
    expect(screen.getByRole('heading', { name: /novo cartão/i })).toBeInTheDocument()
  })
})
