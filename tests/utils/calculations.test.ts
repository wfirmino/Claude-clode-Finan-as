import { describe, it, expect } from 'vitest'
import {
  calculateBalance,
  calculateCurrentMonthTotals,
  calculateMonthlyTotals,
  calculateCategoryTotals,
  calculateGoalProgress,
  isGoalAtRisk,
  calculatePerfilMonthTotals,
  calculateKommoMonthTotals,
} from '../../src/utils/calculations'
import type { Transaction, Goal } from '../../src/types'

const TODAY = new Date()
const YEAR = TODAY.getFullYear()
const MONTH = String(TODAY.getMonth() + 1).padStart(2, '0')

const cat1: import('../../src/types').Category = {
  id: 'c1', user_id: 'u1', name: 'Trabalho', type: 'income', color: '#22c55e', created_at: '',
}
const cat2: import('../../src/types').Category = {
  id: 'c2', user_id: 'u1', name: 'Alimentação', type: 'expense', color: '#ef4444', created_at: '',
}

const transactions: Transaction[] = [
  { id: '1', user_id: 'u1', category_id: 'c1', title: 'Salário', amount: 5000, type: 'income', date: `${YEAR}-${MONTH}-01`, notes: null, created_at: '', categories: cat1 },
  { id: '2', user_id: 'u1', category_id: 'c2', title: 'Mercado', amount: 300, type: 'expense', date: `${YEAR}-${MONTH}-05`, notes: null, created_at: '', categories: cat2 },
  { id: '3', user_id: 'u1', category_id: 'c2', title: 'Restaurante', amount: 100, type: 'expense', date: `${YEAR}-${MONTH}-10`, notes: null, created_at: '', categories: cat2 },
]

describe('calculateBalance', () => {
  it('subtracts expenses from income', () => {
    expect(calculateBalance(transactions)).toBe(4600)
  })
  it('returns 0 for empty array', () => {
    expect(calculateBalance([])).toBe(0)
  })
})

describe('calculateCurrentMonthTotals', () => {
  it('sums income and expense for the current month', () => {
    const result = calculateCurrentMonthTotals(transactions)
    expect(result.income).toBe(5000)
    expect(result.expense).toBe(400)
  })
})

describe('calculateMonthlyTotals', () => {
  it('returns an array of length equal to months param', () => {
    const result = calculateMonthlyTotals(transactions, 6)
    expect(result).toHaveLength(6)
  })
  it('last entry matches current month totals', () => {
    const result = calculateMonthlyTotals(transactions, 6)
    const last = result[result.length - 1]
    expect(last.income).toBe(5000)
    expect(last.expense).toBe(400)
  })
})

describe('calculateCategoryTotals', () => {
  it('groups expense transactions by category', () => {
    const result = calculateCategoryTotals(transactions)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Alimentação')
    expect(result[0].value).toBe(400)
  })
  it('excludes income transactions', () => {
    const result = calculateCategoryTotals(transactions)
    expect(result.find(r => r.name === 'Trabalho')).toBeUndefined()
  })
})

describe('calculateGoalProgress', () => {
  it('returns percentage of current/target', () => {
    const goal: Goal = { id: '1', user_id: 'u1', title: 'Meta', target: 1000, current: 250, deadline: '2026-12-31', created_at: '2026-01-01' }
    expect(calculateGoalProgress(goal)).toBe(25)
  })
  it('caps at 100 when current exceeds target', () => {
    const goal: Goal = { id: '1', user_id: 'u1', title: 'Meta', target: 100, current: 150, deadline: '2026-12-31', created_at: '2026-01-01' }
    expect(calculateGoalProgress(goal)).toBe(100)
  })
  it('returns 0 for zero target', () => {
    const goal: Goal = { id: '1', user_id: 'u1', title: 'Meta', target: 0, current: 0, deadline: '2026-12-31', created_at: '2026-01-01' }
    expect(calculateGoalProgress(goal)).toBe(0)
  })
})

describe('isGoalAtRisk', () => {
  it('returns true when deadline is within 30 days and progress is behind schedule', () => {
    const soon = new Date()
    soon.setDate(soon.getDate() + 15)
    const goal: Goal = {
      id: '1', user_id: 'u1', title: 'Meta', target: 1000, current: 100,
      deadline: soon.toISOString().split('T')[0],
      created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    }
    expect(isGoalAtRisk(goal)).toBe(true)
  })
  it('returns false when progress is on track', () => {
    const far = new Date()
    far.setFullYear(far.getFullYear() + 1)
    const goal: Goal = {
      id: '1', user_id: 'u1', title: 'Meta', target: 1000, current: 900,
      deadline: far.toISOString().split('T')[0],
      created_at: '2026-01-01',
    }
    expect(isGoalAtRisk(goal)).toBe(false)
  })
  it('returns true when deadline is past and goal is incomplete', () => {
    const past = new Date()
    past.setDate(past.getDate() - 1)
    const goal: Goal = {
      id: '1', user_id: 'u1', title: 'Meta', target: 1000, current: 500,
      deadline: past.toISOString().split('T')[0],
      created_at: '2026-01-01',
    }
    expect(isGoalAtRisk(goal)).toBe(true)
  })
  it('returns false when deadline is past and goal is complete', () => {
    const past = new Date()
    past.setDate(past.getDate() - 1)
    const goal: Goal = {
      id: '1', user_id: 'u1', title: 'Meta', target: 1000, current: 1000,
      deadline: past.toISOString().split('T')[0],
      created_at: '2026-01-01',
    }
    expect(isGoalAtRisk(goal)).toBe(false)
  })
})

const txPessoal: Transaction[] = [
  { id: 'p1', user_id: 'u1', category_id: null, title: 'Salário pessoal', amount: 3000, type: 'income', date: `${YEAR}-${MONTH}-01`, notes: null, created_at: '', perfil: 'pessoal' },
  { id: 'p2', user_id: 'u1', category_id: null, title: 'Supermercado', amount: 500, type: 'expense', date: `${YEAR}-${MONTH}-05`, notes: null, created_at: '', perfil: 'pessoal' },
]
const txEmpresarial: Transaction[] = [
  { id: 'e1', user_id: 'u1', category_id: null, title: 'Receita empresa', amount: 10000, type: 'income', date: `${YEAR}-${MONTH}-01`, notes: null, created_at: '', perfil: 'empresarial' },
  { id: 'e2', user_id: 'u1', category_id: null, title: 'Despesa empresa', amount: 2000, type: 'expense', date: `${YEAR}-${MONTH}-10`, notes: null, created_at: '', perfil: 'empresarial' },
]
const txKommo: Transaction[] = [
  { id: 'k1', user_id: 'u1', category_id: null, title: 'Assinatura Kommo', amount: 5000, type: 'income', date: `${YEAR}-${MONTH}-01`, notes: null, created_at: '', perfil: 'kommo', valor_pago_kommo: 1500, valor_liquido_recebido: 3500 },
]
const allPerfilTx = [...txPessoal, ...txEmpresarial, ...txKommo]

describe('calculatePerfilMonthTotals', () => {
  it('retorna income, expense e balance para pessoal', () => {
    const r = calculatePerfilMonthTotals(allPerfilTx, 'pessoal')
    expect(r.income).toBe(3000)
    expect(r.expense).toBe(500)
    expect(r.balance).toBe(2500)
  })
  it('retorna zeros quando não há transações para o perfil', () => {
    const r = calculatePerfilMonthTotals(allPerfilTx, 'cartao')
    expect(r.income).toBe(0)
    expect(r.expense).toBe(0)
    expect(r.balance).toBe(0)
  })
  it('não inclui transações de outros perfis', () => {
    const r = calculatePerfilMonthTotals(allPerfilTx, 'empresarial')
    expect(r.income).toBe(10000)
    expect(r.expense).toBe(2000)
    expect(r.balance).toBe(8000)
  })
})

describe('calculateKommoMonthTotals', () => {
  it('retorna income, valorPagoKommo e valorLiquidoRecebido', () => {
    const r = calculateKommoMonthTotals(allPerfilTx)
    expect(r.income).toBe(5000)
    expect(r.valorPagoKommo).toBe(1500)
    expect(r.valorLiquidoRecebido).toBe(3500)
    expect(r.balance).toBe(3500) // 5000 - 1500
  })
  it('retorna zeros para array vazio', () => {
    const r = calculateKommoMonthTotals([])
    expect(r.income).toBe(0)
    expect(r.valorPagoKommo).toBe(0)
    expect(r.valorLiquidoRecebido).toBe(0)
  })
  it('trata transações sem valor_pago_kommo como zero', () => {
    const txSemCampos: Transaction[] = [
      { id: 'k2', user_id: 'u1', category_id: null, title: 'Kommo sem campos', amount: 1000, type: 'income', date: `${YEAR}-${MONTH}-01`, notes: null, created_at: '', perfil: 'kommo' },
    ]
    const r = calculateKommoMonthTotals(txSemCampos)
    expect(r.income).toBe(1000)
    expect(r.valorPagoKommo).toBe(0)
    expect(r.valorLiquidoRecebido).toBe(0)
  })
})
