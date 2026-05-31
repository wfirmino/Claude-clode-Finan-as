import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
    },
    from: vi.fn(),
  },
}))

import { supabase } from '../../src/lib/supabase'
import { useCards } from '../../src/hooks/useCards'

const mockCards = [
  { id: 'c1', user_id: 'u1', name: 'Nubank', due_day: 10, color: '#8b5cf6', created_at: '' },
  { id: 'c2', user_id: 'u1', name: 'Itaú', due_day: 15, color: '#6366f1', created_at: '' },
]

function mockFrom() {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: mockCards, error: null }),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
  }
  vi.mocked(supabase.from).mockReturnValue(chain as any)
  return chain
}

describe('useCards', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches cards on mount', async () => {
    mockFrom()
    const { result } = renderHook(() => useCards())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.cards).toHaveLength(2)
    expect(result.current.cards[0].name).toBe('Nubank')
  })

  it('createCard inserts with user_id', async () => {
    const chain = mockFrom()
    const { result } = renderHook(() => useCards())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.createCard({ name: 'Bradesco', due_day: 5, color: '#ef4444' })
    })
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', name: 'Bradesco', due_day: 5 })
    )
  })

  it('deleteCard calls delete with card id', async () => {
    const chain = mockFrom()
    const { result } = renderHook(() => useCards())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.deleteCard('c1') })
    expect(chain.delete).toHaveBeenCalled()
  })
})
