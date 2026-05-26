import { renderHook, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn(),
  },
}))

import { supabase } from '../../src/lib/supabase'
import { useTransactions } from '../../src/hooks/useTransactions'

function mockChain(data: object[]) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: (res: (v: unknown) => void) => Promise.resolve({ data, error: null, count: data.length }).then(res),
    catch: (rej: (e: unknown) => void) => Promise.resolve({ data, error: null, count: data.length }).catch(rej),
  }
  vi.mocked(supabase.from).mockReturnValue(chain as any)
  return chain
}

describe('useTransactions perfil filter', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls eq("perfil", ...) when perfil filter is set', async () => {
    const chain = mockChain([])
    renderHook(() => useTransactions({ perfil: 'kommo' }))
    await waitFor(() => expect(chain.eq).toHaveBeenCalledWith('perfil', 'kommo'))
  })

  it('does not call eq("perfil", ...) when perfil is undefined', async () => {
    const chain = mockChain([])
    renderHook(() => useTransactions({}))
    await waitFor(() => expect(chain.eq).not.toHaveBeenCalledWith('perfil', expect.anything()))
  })
})
