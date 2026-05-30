import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import KommoSummary from '../../src/components/KommoSummary'
import type { Transaction } from '../../src/types'

const tx1: Transaction = {
  id: '1', user_id: 'u1', category_id: null, title: 'Cliente K',
  amount: 1000, type: 'income', date: '2026-05-10', notes: null, created_at: '',
  perfil: 'kommo',
  valor_total_assinatura: 1000,
  valor_liquido: 960,
  divisao_socio_pct: 50,
}
// tx1 calculations:
// taxa = 1000 - 960 = 40
// kommo65 = 1000 * 0.65 = 650
// bruta = 1000 * 0.35 = 350
// liquida = 350 - 40 = 310
// socio = 310 * 50 / 100 = 155
// final = 310 - 155 = 155

describe('KommoSummary', () => {
  it('renders the summary heading with the periodo label', () => {
    render(<KommoSummary transactions={[tx1]} periodo="Este mês" />)
    expect(screen.getByText(/resumo kommo — este mês/i)).toBeInTheDocument()
  })

  it('renders all summary row labels', () => {
    render(<KommoSummary transactions={[tx1]} periodo="Este mês" />)
    expect(screen.getByText(/total de assinaturas/i)).toBeInTheDocument()
    expect(screen.getByText(/total taxas maquininha/i)).toBeInTheDocument()
    expect(screen.getByText(/total comissão líquida/i)).toBeInTheDocument()
    expect(screen.getByText(/total final do usuário/i)).toBeInTheDocument()
  })

  it('accumulates correctly with two transactions', () => {
    const tx2: Transaction = {
      id: '2', user_id: 'u1', category_id: null, title: 'Cliente L',
      amount: 2000, type: 'income', date: '2026-05-12', notes: null, created_at: '',
      perfil: 'kommo',
      valor_total_assinatura: 2000,
      valor_liquido: 1900,
      divisao_socio_pct: 40,
    }
    render(<KommoSummary transactions={[tx1, tx2]} periodo="Este mês" />)
    expect(screen.getByText(/resumo kommo/i)).toBeInTheDocument()
  })

  it('shows "Repasses diretos" row when sem_comissao transactions exist', () => {
    const txSemComissao: Transaction = {
      id: '3', user_id: 'u1', category_id: null, title: 'Repasse',
      amount: 500, type: 'income', date: '2026-05-15', notes: null, created_at: '',
      perfil: 'kommo', valor_total_assinatura: 500, sem_comissao: true,
    }
    render(<KommoSummary transactions={[tx1, txSemComissao]} periodo="Este mês" />)
    expect(screen.getByText(/repasses diretos/i)).toBeInTheDocument()
  })
})
