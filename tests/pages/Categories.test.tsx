import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Categories from '../../src/pages/Categories'

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

const mockCategories = [
  { id: 'c1', user_id: 'u1', name: 'Alimentação', type: 'expense', color: '#ef4444', created_at: '' },
  { id: 'c2', user_id: 'u1', name: 'Salário', type: 'income', color: '#22c55e', created_at: '' },
]

function mockFrom(data: any[], countResult = 0) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error: null }),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockReturnThis(),
  }
  chain.select.mockImplementation((cols: string, opts?: any) => {
    if (opts?.count) return { ...chain, then: (cb: any) => cb({ count: countResult, error: null }) }
    return chain
  })
  vi.mocked(supabase.from).mockReturnValue(chain as any)
  return chain
}

describe('Categories page', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders list of categories', async () => {
    mockFrom(mockCategories)
    render(<MemoryRouter><Categories /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Alimentação')).toBeInTheDocument()
      expect(screen.getByText('Salário')).toBeInTheDocument()
    })
  })

  it('opens modal when "Nova Categoria" is clicked', async () => {
    mockFrom(mockCategories)
    render(<MemoryRouter><Categories /></MemoryRouter>)
    await waitFor(() => screen.getByText('Alimentação'))
    fireEvent.click(screen.getByRole('button', { name: /nova categoria/i }))
    expect(screen.getByRole('heading', { name: /nova categoria/i })).toBeInTheDocument()
  })
})
