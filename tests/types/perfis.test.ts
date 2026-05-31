import { describe, it, expectTypeOf } from 'vitest'
import type { Perfil, Transaction, EmpresarialConfig } from '../../src/types'

describe('Perfil types', () => {
  it('Perfil is union of four strings', () => {
    expectTypeOf<Perfil>().toEqualTypeOf<'pessoal' | 'empresarial' | 'kommo' | 'cartao'>()
  })

  it('Transaction has optional perfil fields', () => {
    const t: Transaction = {
      id: '1', user_id: 'u1', category_id: null,
      title: 'Test', amount: 100, type: 'income',
      date: '2026-01-01', notes: null, created_at: '',
      perfil: 'kommo',
      nome_cliente: 'João',
      plano: 12,
    }
    expectTypeOf(t.perfil).toEqualTypeOf<Perfil | undefined>()
  })

  it('EmpresarialConfig has correct shape', () => {
    const c: EmpresarialConfig = { user_id: 'u1', mes: '2026-05', prolabore: 3000 }
    expectTypeOf(c.mes).toEqualTypeOf<string>()
  })
})
