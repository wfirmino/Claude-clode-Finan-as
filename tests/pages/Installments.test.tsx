import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Installments from '../../src/pages/Installments'

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

// Future date ensures 'em_dia' status (next due date ahead of today)
const futureBase = new Date()
futureBase.setMonth(futureBase.getMonth() + 3)
const futureDateStr = futureBase.toISOString().split('T')[0]

const mockInstallments = [
  {
    id: 'i1',
    user_id: 'u1',
    name: 'iPhone 15',
    original_amount: 5000,
    interest_amount: 500,
    total_amount: 5500,
    installment_amount: 458.33,
    total_installments: 12,
    paid_installments: 4,
    first_payment_date: futureDateStr,
    category: 'Eletrônicos',
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'i2',
    user_id: 'u1',
    name: 'Notebook',
    original_amount: 3000,
    interest_amount: 0,
    total_amount: 3000,
    installment_amount: 250,
    total_installments: 12,
    paid_installments: 12,
    first_payment_date: '2025-01-10',
    category: null,
    notes: null,
    created_at: '2025-01-01T00:00:00Z',
  },
]

function mockFrom(data: typeof mockInstallments | [] = mockInstallments) {
  const resolved = { data, error: null }
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => void) => Promise.resolve(resolved).then(resolve),
    catch: (reject: (e: unknown) => void) => Promise.resolve(resolved).catch(reject),
  }
  vi.mocked(supabase.from).mockReturnValue(chain as any)
  return chain
}

function renderInstallments() {
  return render(<MemoryRouter><Installments /></MemoryRouter>)
}

describe('Installments page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom()
  })

  it('renders installments list with names', async () => {
    renderInstallments()
    await waitFor(() => {
      expect(screen.getAllByText('iPhone 15')[0]).toBeInTheDocument()
      expect(screen.getAllByText('Notebook')[0]).toBeInTheDocument()
    })
  })

  it('shows empty state when there are no installments', async () => {
    mockFrom([])
    renderInstallments()
    await waitFor(() => {
      expect(screen.getByText(/nenhum parcelamento cadastrado/i)).toBeInTheDocument()
    })
  })

  it('renders summary cards', async () => {
    renderInstallments()
    await waitFor(() => {
      expect(screen.getByText(/total em aberto/i)).toBeInTheDocument()
      expect(screen.getByText(/total já pago/i)).toBeInTheDocument()
      expect(screen.getAllByText(/ativos/i)[0]).toBeInTheDocument()
    })
  })

  it('shows error banner when Supabase returns an error', async () => {
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: (resolve: (v: unknown) => void) => Promise.resolve({ data: null, error: { message: 'Falha na conexão' } }).then(resolve),
      catch: (reject: (e: unknown) => void) => Promise.resolve({ data: null, error: { message: 'Falha na conexão' } }).catch(reject),
    }
    vi.mocked(supabase.from).mockReturnValue(chain as any)
    renderInstallments()
    await waitFor(() => {
      expect(screen.getByText(/erro ao carregar parcelamentos/i)).toBeInTheDocument()
    })
  })

  it('opens create modal when "Novo Parcelamento" button is clicked', async () => {
    renderInstallments()
    await waitFor(() => screen.getAllByText('iPhone 15')[0])
    fireEvent.click(screen.getByRole('button', { name: /novo parcelamento/i }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /novo parcelamento/i })).toBeInTheDocument()
    })
  })

  it('submits create form with correct user_id and name', async () => {
    const chain = mockFrom()
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    chain.insert = insertMock
    renderInstallments()
    await waitFor(() => screen.getAllByText('iPhone 15')[0])

    fireEvent.click(screen.getByRole('button', { name: /novo parcelamento/i }))
    await waitFor(() => screen.getByRole('heading', { name: /novo parcelamento/i }))

    fireEvent.change(screen.getByLabelText(/nome da compra/i), { target: { value: 'TV Samsung' } })
    fireEvent.change(screen.getByLabelText(/valor original/i), { target: { value: '3000' } })
    fireEvent.change(screen.getByLabelText(/de parcelas/i), { target: { value: '12' } })

    fireEvent.click(screen.getByRole('button', { name: /criar parcelamento/i }))
    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'u1', name: 'TV Samsung', total_installments: 12 })
      )
    })
  })

  it('shows delete confirmation buttons after clicking Excluir', async () => {
    renderInstallments()
    await waitFor(() => screen.getAllByText('iPhone 15')[0])

    const deleteButtons = screen.getAllByRole('button', { name: /excluir/i })
    fireEvent.click(deleteButtons[0])
    expect(screen.getAllByRole('button', { name: /^sim$/i })[0]).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^não$/i })[0]).toBeInTheDocument()
  })

  it('cancels delete when "Não" is clicked', async () => {
    renderInstallments()
    await waitFor(() => screen.getAllByText('iPhone 15')[0])

    const deleteButtons = screen.getAllByRole('button', { name: /excluir/i })
    fireEvent.click(deleteButtons[0])
    fireEvent.click(screen.getAllByRole('button', { name: /^não$/i })[0])
    expect(screen.queryByRole('button', { name: /^sim$/i })).not.toBeInTheDocument()
  })

  it('calls delete on the installment after confirming', async () => {
    const chain = mockFrom()
    const deleteMock = vi.fn().mockReturnThis()
    chain.delete = deleteMock
    renderInstallments()
    await waitFor(() => screen.getAllByText('iPhone 15')[0])

    const deleteButtons = screen.getAllByRole('button', { name: /excluir/i })
    fireEvent.click(deleteButtons[0])
    fireEvent.click(screen.getAllByRole('button', { name: /^sim$/i })[0])
    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalled()
    })
  })

  it('calls update with paid_installments incremented when "Pagar parcela" is clicked', async () => {
    const chain = mockFrom()
    const updateMock = vi.fn().mockReturnThis()
    chain.update = updateMock
    renderInstallments()
    await waitFor(() => screen.getAllByText('iPhone 15')[0])

    const payButtons = screen.getAllByText('Pagar parcela')
    fireEvent.click(payButtons[0])
    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ paid_installments: 5 })
      )
    })
  })

  it('opens edit modal pre-filled with installment data', async () => {
    renderInstallments()
    await waitFor(() => screen.getAllByText('iPhone 15')[0])

    const editButtons = screen.getAllByRole('button', { name: /editar/i })
    fireEvent.click(editButtons[0])
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /editar parcelamento/i })).toBeInTheDocument()
      expect(screen.getByDisplayValue('iPhone 15')).toBeInTheDocument()
    })
  })

  it('shows "Quitado" badge for fully paid installments', async () => {
    renderInstallments()
    await waitFor(() => {
      expect(screen.getAllByText('Quitado')[0]).toBeInTheDocument()
    })
  })

  it('shows category label when installment has a category', async () => {
    renderInstallments()
    await waitFor(() => {
      expect(screen.getAllByText('Eletrônicos')[0]).toBeInTheDocument()
    })
  })
})
