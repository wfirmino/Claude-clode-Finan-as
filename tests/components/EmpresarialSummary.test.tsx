import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import EmpresarialSummary from '../../src/components/EmpresarialSummary'
import type { Transaction } from '../../src/types'

const txs: Transaction[] = [
  {
    id: '1', user_id: 'u1', category_id: null, title: 'Cliente A',
    amount: 5000, type: 'income', date: '2026-05-10', notes: null, created_at: '',
    perfil: 'empresarial', divisao_socio: 1000,
  },
  {
    id: '2', user_id: 'u1', category_id: null, title: 'Custo',
    amount: 500, type: 'expense', date: '2026-05-15', notes: null, created_at: '',
    perfil: 'empresarial',
  },
]

const onSaveProlabore = vi.fn().mockResolvedValue(undefined)

describe('EmpresarialSummary', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the summary section', () => {
    render(<EmpresarialSummary transactions={txs} mes="2026-05" prolabore={0} onSaveProlabore={onSaveProlabore} />)
    expect(screen.getByText(/resumo empresarial/i)).toBeInTheDocument()
  })

  it('shows faturamento, divisão sócio and despesa MEI values', () => {
    render(<EmpresarialSummary transactions={txs} mes="2026-05" prolabore={0} onSaveProlabore={onSaveProlabore} />)
    // Faturamento = 5000, totalSocio = 1000, despesaMEI = 500
    expect(screen.getByText(/faturamento total/i)).toBeInTheDocument()
    expect(screen.getByText(/total dividido com sócio/i)).toBeInTheDocument()
    expect(screen.getByText(/despesa mei/i)).toBeInTheDocument()
  })

  it('calls onSaveProlabore when Salvar is clicked', async () => {
    render(<EmpresarialSummary transactions={txs} mes="2026-05" prolabore={0} onSaveProlabore={onSaveProlabore} />)
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '1000' } })
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))
    await waitFor(() => expect(onSaveProlabore).toHaveBeenCalledWith(1000, '2026-05'))
  })
})
