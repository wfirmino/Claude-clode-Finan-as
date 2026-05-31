import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Goals from '../../src/pages/Goals'

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

const today = new Date().toISOString().split('T')[0]
const futureDeadline = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
const nearDeadline = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
// created 20 days ago so that expectedProgress ~0.67, making current/target=0.25 at-risk
const createdLongAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()

const mockGoals = [
  { id: 'g1', user_id: 'u1', title: 'Viagem', target: 5000, current: 1000, deadline: futureDeadline, created_at: today },
  { id: 'g2', user_id: 'u1', title: 'Emergência', target: 2000, current: 500, deadline: nearDeadline, created_at: createdLongAgo },
]

function mockFrom(data: object[]) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error: null }),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  }
  vi.mocked(supabase.from).mockReturnValue(chain as any)
  return chain
}

describe('Goals page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { user: { id: 'u1' } } } } as any)
  })

  it('renders list of goals', async () => {
    mockFrom(mockGoals)
    render(<MemoryRouter><Goals /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Viagem')).toBeInTheDocument()
      expect(screen.getByText('Emergência')).toBeInTheDocument()
    })
  })

  it('shows at-risk badge for goal with deadline within 30 days and behind schedule', async () => {
    mockFrom(mockGoals)
    render(<MemoryRouter><Goals /></MemoryRouter>)
    await waitFor(() => screen.getByText('Emergência'))
    expect(screen.getByText(/atenção: prazo próximo/i)).toBeInTheDocument()
  })

  it('opens modal when "Nova Meta" is clicked', async () => {
    mockFrom(mockGoals)
    render(<MemoryRouter><Goals /></MemoryRouter>)
    await waitFor(() => screen.getByText('Viagem'))
    fireEvent.click(screen.getByRole('button', { name: /nova meta/i }))
    expect(screen.getByRole('heading', { name: /nova meta/i })).toBeInTheDocument()
  })

  it('shows error toast when current > target is submitted', async () => {
    mockFrom(mockGoals)
    render(<MemoryRouter><Goals /></MemoryRouter>)
    await waitFor(() => screen.getByText('Viagem'))
    fireEvent.click(screen.getByRole('button', { name: /nova meta/i }))
    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: 'Meta teste' } })
    fireEvent.change(screen.getByLabelText(/valor alvo/i), { target: { value: '100' } })
    fireEvent.change(screen.getByLabelText(/valor atual/i), { target: { value: '200' } })
    // date input is the only input[type=date] in the modal
    const dateInputs = document.querySelectorAll('input[type="date"]')
    fireEvent.change(dateInputs[dateInputs.length - 1], { target: { value: futureDeadline } })
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))
    await waitFor(() => {
      expect(screen.getByText(/valor atual não pode ser maior/i)).toBeInTheDocument()
    })
  })

  it('deletes a goal after inline confirmation', async () => {
    const chain = mockFrom(mockGoals)
    render(<MemoryRouter><Goals /></MemoryRouter>)
    await waitFor(() => screen.getByText('Viagem'))
    const deleteButtons = screen.getAllByRole('button', { name: /excluir/i })
    fireEvent.click(deleteButtons[0])
    expect(screen.getByRole('button', { name: /^sim$/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^sim$/i }))
    await waitFor(() => {
      expect(chain.delete).toHaveBeenCalled()
    })
  })

  it('calls insert with user_id when valid form is submitted', async () => {
    const chain = mockFrom(mockGoals)
    render(<MemoryRouter><Goals /></MemoryRouter>)
    await waitFor(() => screen.getByText('Viagem'))
    fireEvent.click(screen.getByRole('button', { name: /nova meta/i }))
    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: 'Nova meta' } })
    fireEvent.change(screen.getByLabelText(/valor alvo/i), { target: { value: '1000' } })
    fireEvent.change(screen.getByLabelText(/valor atual/i), { target: { value: '200' } })
    fireEvent.change(screen.getByDisplayValue(''), { target: { value: futureDeadline } })
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))
    await waitFor(() => {
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'u1', title: 'Nova meta' })
      )
    })
  })
})
