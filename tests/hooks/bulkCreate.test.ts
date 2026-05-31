import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: vi.fn(),
  },
}))

import { supabase } from '../../src/lib/supabase'
import { useTransactions } from '../../src/hooks/useTransactions'

function mockFrom() {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    then: (r: (v: unknown) => void) => Promise.resolve({ data: [], error: null, count: 0 }).then(r),
  }
  vi.mocked(supabase.from).mockReturnValue(chain as any)
  return chain
}

describe('bulkCreateTransactions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('inserts all rows in a single call and calls fetchAll once', async () => {
    const chain = mockFrom()
    const { result } = renderHook(() => useTransactions())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const rows = [
      { title: 'Compra A', amount: 100, type: 'expense' as const, date: '2026-05-01', perfil: 'cartao' as const, card_id: 'card1', category_id: null, notes: null },
      { title: 'Compra B', amount: 200, type: 'expense' as const, date: '2026-05-02', perfil: 'cartao' as const, card_id: 'card1', category_id: null, notes: null },
    ]
    await act(async () => { await result.current.bulkCreateTransactions(rows) })
    expect(chain.insert).toHaveBeenCalledTimes(1)
    expect(chain.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Compra A', user_id: 'u1' }),
        expect.objectContaining({ title: 'Compra B', user_id: 'u1' }),
      ])
    )
  })
})
