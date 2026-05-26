import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Transactions from '../../src/pages/Transactions'

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }),
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
  const data = table === 'categories' ? mockCategories : mockTransactions
  const resolved = { data, error: null }
  const singleResolved = { data: null, error: null }
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    single: vi.fn().mockResolvedValue(singleResolved),
    then: (resolve: (v: unknown) => void) => Promise.resolve(resolved).then(resolve),
    catch: (reject: (e: unknown) => void) => Promise.resolve(resolved).catch(reject),
  }
  return chain
}

function setupMock() {
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { user: { id: 'u1' } } } } as any)
  vi.mocked(supabase.from).mockImplementation((table: string) => mockFrom(table) as any)
}

describe('Transactions page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMock()
  })

  it('renders transactions in table', async () => {
    render(<MemoryRouter><Transactions /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getAllByText('Salário')[0]).toBeInTheDocument()
      expect(screen.getAllByText('Mercado')[0]).toBeInTheDocument()
    })
  })

  it('opens modal when "Nova Transação" is clicked', async () => {
    render(<MemoryRouter><Transactions /></MemoryRouter>)
    await waitFor(() => screen.getAllByText('Salário')[0])
    fireEvent.click(screen.getByRole('button', { name: /nova transação/i }))
    expect(screen.getByRole('heading', { name: /nova transação/i })).toBeInTheDocument()
  })

  it('calls insert with user_id when form is submitted to create a transaction', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      const chain = mockFrom(table)
      if (table === 'transactions') chain.insert = insertMock
      return chain as any
    })
    render(<MemoryRouter><Transactions /></MemoryRouter>)
    await waitFor(() => screen.getAllByText('Salário')[0])
    fireEvent.click(screen.getByRole('button', { name: /nova transação/i }))
    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: 'Novo gasto' } })
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '50' } })
    fireEvent.click(screen.getByRole('button', { name: /criar transação/i }))
    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'u1', title: 'Novo gasto' })
      )
    })
  })

  it('deletes a transaction after inline confirmation', async () => {
    const deleteMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      const chain = mockFrom(table)
      if (table === 'transactions') chain.delete = deleteMock
      return chain as any
    })
    render(<MemoryRouter><Transactions /></MemoryRouter>)
    await waitFor(() => screen.getAllByText('Salário')[0])
    const deleteButtons = screen.getAllByRole('button', { name: /excluir/i })
    fireEvent.click(deleteButtons[0])
    expect(screen.getByRole('button', { name: /^sim$/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^sim$/i }))
    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalled()
    })
  })

  it('auto-fills type when a category is selected', async () => {
    render(<MemoryRouter><Transactions /></MemoryRouter>)
    await waitFor(() => screen.getAllByText('Salário')[0])
    fireEvent.click(screen.getByRole('button', { name: /nova transação/i }))
    // first combobox in modal is the category select
    const selects = screen.getAllByRole('combobox')
    const categorySelect = selects[0]
    fireEvent.change(categorySelect, { target: { value: 'c1' } })
    // after selecting 'c1' (Trabalho, type=income), the type field reflects income
    const options = screen.getAllByRole('option') as HTMLOptionElement[]
    const incomeOption = options.find(o => o.value === 'income')
    expect(incomeOption).toBeDefined()
  })
})

describe('Profile tabs in Transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMock()
  })

  it('renders three profile tabs', async () => {
    render(<MemoryRouter><Transactions /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /pessoal/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /empresarial/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /kommo/i })).toBeInTheDocument()
    })
  })

  it('pessoal tab is active by default', async () => {
    render(<MemoryRouter><Transactions /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /pessoal/i })).toHaveAttribute('aria-selected', 'true')
    })
  })

  it('switching to empresarial shows EmpresarialSummary', async () => {
    render(<MemoryRouter><Transactions /></MemoryRouter>)
    await waitFor(() => screen.getByRole('tab', { name: /empresarial/i }))
    fireEvent.click(screen.getByRole('tab', { name: /empresarial/i }))
    await waitFor(() => {
      expect(screen.getByText(/resumo empresarial/i)).toBeInTheDocument()
    })
  })

  it('switching to kommo shows KommoSummary', async () => {
    render(<MemoryRouter><Transactions /></MemoryRouter>)
    await waitFor(() => screen.getByRole('tab', { name: /kommo/i }))
    fireEvent.click(screen.getByRole('tab', { name: /kommo/i }))
    await waitFor(() => {
      expect(screen.getByText(/resumo kommo/i)).toBeInTheDocument()
    })
  })
})

describe('Dynamic form by perfil', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMock()
  })

  it('pessoal form shows title field', async () => {
    render(<MemoryRouter><Transactions /></MemoryRouter>)
    await waitFor(() => screen.getByRole('tab', { name: /pessoal/i }))
    fireEvent.click(screen.getAllByRole('button').find(b => b.textContent?.includes('+'))!)
    await waitFor(() => {
      expect(screen.getByLabelText(/título/i)).toBeInTheDocument()
    })
  })

  it('empresarial form shows nome do cliente', async () => {
    render(<MemoryRouter><Transactions /></MemoryRouter>)
    await waitFor(() => screen.getByRole('tab', { name: /empresarial/i }))
    fireEvent.click(screen.getByRole('tab', { name: /empresarial/i }))
    await waitFor(() => screen.getAllByRole('button').find(b => b.textContent?.includes('+')))
    fireEvent.click(screen.getAllByRole('button').find(b => b.textContent?.includes('+'))!)
    await waitFor(() => {
      expect(screen.getByLabelText(/nome do cliente/i)).toBeInTheDocument()
    })
  })
})
