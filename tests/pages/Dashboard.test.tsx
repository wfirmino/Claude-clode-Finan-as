import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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

vi.mock('../../src/hooks/useEmpresarialConfig', () => ({
  useEmpresarialConfig: () => ({ prolabore: 2000, saveProlabore: vi.fn(), loading: false }),
}))

import { supabase } from '../../src/lib/supabase'

const currentMonth = new Date().toISOString().split('T')[0].slice(0, 7)

const mockTransactions = [
  { id: 't1', user_id: 'u1', category_id: 'c1', title: 'Salário', amount: 5000, type: 'income', date: `${currentMonth}-01`, notes: null, created_at: '', categories: { id: 'c1', user_id: 'u1', name: 'Trabalho', type: 'income', color: '#22c55e', created_at: '' } },
  { id: 't2', user_id: 'u1', category_id: 'c2', title: 'Mercado', amount: 300, type: 'expense', date: `${currentMonth}-05`, notes: null, created_at: '', categories: { id: 'c2', user_id: 'u1', name: 'Alimentação', type: 'expense', color: '#ef4444', created_at: '' } },
]

function mockFrom(data: object[], count: number | null = null) {
  const resolved = { data, error: null, count }
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

  it('shows error banner when fetch fails', async () => {
    const resolved = { data: null, error: { message: 'Conexão recusada' } }
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
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText(/erro ao carregar transações/i)).toBeInTheDocument()
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

  it('shows truncation warning when server count exceeds fetched rows', async () => {
    mockFrom(mockTransactions, 5000)
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText(/o limite do servidor foi atingido/i)).toBeInTheDocument()
      expect(screen.getByText(/saldo calculado sobre/i)).toBeInTheDocument()
    })
  })

  it('does not show truncation warning when all rows are fetched', async () => {
    mockFrom(mockTransactions, mockTransactions.length)
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    await waitFor(() => screen.getByText(/saldo atual/i))
    expect(screen.queryByText(/o limite do servidor foi atingido/i)).not.toBeInTheDocument()
  })
})

const mockTransactionsComPerfil = [
  { id: 't1', user_id: 'u1', category_id: null, title: 'Salário pessoal', amount: 3000, type: 'income', date: `${currentMonth}-01`, notes: null, created_at: '', categories: null, perfil: 'pessoal' },
  { id: 't2', user_id: 'u1', category_id: null, title: 'Supermercado', amount: 500, type: 'expense', date: `${currentMonth}-05`, notes: null, created_at: '', categories: null, perfil: 'pessoal' },
  { id: 't3', user_id: 'u1', category_id: null, title: 'Receita empresa', amount: 8000, type: 'income', date: `${currentMonth}-01`, notes: null, created_at: '', categories: null, perfil: 'empresarial' },
  { id: 't4', user_id: 'u1', category_id: null, title: 'Kommo cliente', amount: 5000, type: 'income', date: `${currentMonth}-01`, notes: null, created_at: '', categories: null, perfil: 'kommo', valor_pago_kommo: 1200, valor_liquido_recebido: 3800 },
]

describe('Dashboard tabs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renderiza as quatro abas', async () => {
    mockFrom(mockTransactionsComPerfil)
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /geral/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /pessoal/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /empresarial/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /kommo/i })).toBeInTheDocument()
    })
  })

  it('abre na aba Geral por padrão', async () => {
    mockFrom(mockTransactionsComPerfil)
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText(/saldo atual/i)).toBeInTheDocument()
    })
  })

  it('aba Pessoal exibe receitas, despesas e saldo do mês filtrados por pessoal', async () => {
    mockFrom(mockTransactionsComPerfil)
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    await waitFor(() => screen.getByRole('button', { name: /pessoal/i }))
    fireEvent.click(screen.getByRole('button', { name: /pessoal/i }))
    await waitFor(() => {
      expect(screen.getByText(/receitas do mês/i)).toBeInTheDocument()
      expect(screen.getByText(/despesas do mês/i)).toBeInTheDocument()
      expect(screen.getByText(/saldo do mês/i)).toBeInTheDocument()
    })
  })

  it('aba Empresarial exibe receitas, despesas, saldo e pró-labore', async () => {
    mockFrom(mockTransactionsComPerfil)
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    await waitFor(() => screen.getByRole('button', { name: /empresarial/i }))
    fireEvent.click(screen.getByRole('button', { name: /empresarial/i }))
    await waitFor(() => {
      expect(screen.getByText(/receitas do mês/i)).toBeInTheDocument()
      expect(screen.getByText(/despesas do mês/i)).toBeInTheDocument()
      expect(screen.getByText(/saldo do mês/i)).toBeInTheDocument()
      expect(screen.getByText(/pró-labore/i)).toBeInTheDocument()
    })
  })

  it('aba Kommo exibe receitas, valor pago, líquido e saldo', async () => {
    mockFrom(mockTransactionsComPerfil)
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    await waitFor(() => screen.getByRole('button', { name: /kommo/i }))
    fireEvent.click(screen.getByRole('button', { name: /kommo/i }))
    await waitFor(() => {
      expect(screen.getByText(/receitas brutas/i)).toBeInTheDocument()
      expect(screen.getByText(/valor pago kommo/i)).toBeInTheDocument()
      expect(screen.getByText(/líquido recebido/i)).toBeInTheDocument()
      expect(screen.getByText(/saldo do mês/i)).toBeInTheDocument()
    })
  })
})
