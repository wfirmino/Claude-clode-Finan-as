import { renderHook, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
  },
}))

import { supabase } from '../../src/lib/supabase'
import { useEmpresarialConfig } from '../../src/hooks/useEmpresarialConfig'

function mockFrom(selectData: object | null) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: selectData, error: null }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  }
  vi.mocked(supabase.from).mockReturnValue(chain as any)
  return chain
}

describe('useEmpresarialConfig', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads prolabore for current month', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
    } as any)
    mockFrom({ user_id: 'u1', mes: '2026-05', prolabore: 2500 })
    const { result } = renderHook(() => useEmpresarialConfig())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.prolabore).toBe(2500)
  })

  it('defaults prolabore to 0 when no record found', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
    } as any)
    mockFrom(null)
    const { result } = renderHook(() => useEmpresarialConfig())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.prolabore).toBe(0)
  })

  it('returns prolabore 0 when no session', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
    } as any)
    const { result } = renderHook(() => useEmpresarialConfig())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.prolabore).toBe(0)
  })
})
