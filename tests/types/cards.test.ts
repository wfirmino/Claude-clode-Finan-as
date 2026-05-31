import { describe, it, expectTypeOf } from 'vitest'
import type { Card, Transaction, Perfil } from '../../src/types'

describe('Card type', () => {
  it('Card has required fields', () => {
    expectTypeOf<Card>().toHaveProperty('id')
    expectTypeOf<Card>().toHaveProperty('name')
    expectTypeOf<Card>().toHaveProperty('due_day')
    expectTypeOf<Card>().toHaveProperty('color')
  })

  it('Perfil includes cartao', () => {
    const p: Perfil = 'cartao'
    expectTypeOf(p).toMatchTypeOf<Perfil>()
  })

  it('Transaction has optional card_id', () => {
    expectTypeOf<Transaction>().toHaveProperty('card_id')
  })
})
