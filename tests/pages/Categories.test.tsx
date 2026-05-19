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
  chain.select.mockImplementation((_cols: string, opts?: any) => {
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

  it('calls insert when form is submitted to create a category', async () => {
    const chain = mockFrom(mockCategories)
    render(<MemoryRouter><Categories /></MemoryRouter>)
    await waitFor(() => screen.getByText('Alimentação'))
    fireEvent.click(screen.getByRole('button', { name: /nova categoria/i }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Transporte' } })
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))
    await waitFor(() => {
      expect(chain.insert).toHaveBeenCalled()
    })
  })

  it('shows toast error when delete is blocked because category has transactions', async () => {
    mockFrom(mockCategories, 1)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<MemoryRouter><Categories /></MemoryRouter>)
    await waitFor(() => screen.getByText('Alimentação'))
    const deleteButtons = screen.getAllByRole('button', { name: /excluir/i })
    fireEvent.click(deleteButtons[0])
    await waitFor(() => {
      expect(screen.getByText(/não é possível excluir/i)).toBeInTheDocument()
    })
  })
})
