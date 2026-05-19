import { describe, it, expect } from 'vitest'
import { buildCSVContent } from '../../src/utils/csv'
import type { Transaction } from '../../src/types'

const transactions: Transaction[] = [
  {
    id: '1', user_id: 'u1', category_id: 'c1', title: 'Salário', amount: 5000,
    type: 'income', date: '2026-05-01', notes: null, created_at: '',
    categories: { id: 'c1', user_id: 'u1', name: 'Trabalho', type: 'income', color: '#22c55e', created_at: '' },
  },
]

describe('buildCSVContent', () => {
  it('includes header row', () => {
    const csv = buildCSVContent(transactions)
    expect(csv).toContain('Data')
    expect(csv).toContain('Título')
    expect(csv).toContain('Valor')
  })
  it('maps income type to Receita', () => {
    const csv = buildCSVContent(transactions)
    expect(csv).toContain('Receita')
  })
  it('includes transaction title and amount', () => {
    const csv = buildCSVContent(transactions)
    expect(csv).toContain('Salário')
    expect(csv).toContain('5000.00')
  })
  it('includes category name', () => {
    const csv = buildCSVContent(transactions)
    expect(csv).toContain('Trabalho')
  })
})
