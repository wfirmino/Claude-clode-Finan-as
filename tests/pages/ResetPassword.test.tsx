import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ResetPassword from '../../src/pages/ResetPassword'

let authStateCallback: ((event: string) => void) | null = null

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn().mockImplementation((cb: (event: string) => void) => {
        authStateCallback = cb
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

import { supabase } from '../../src/lib/supabase'

describe('ResetPassword page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authStateCallback = null
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb: any) => {
      authStateCallback = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } } as any
    })
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({ error: null } as any)
  })

  it('shows waiting message before PASSWORD_RECOVERY event', () => {
    render(<MemoryRouter><ResetPassword /></MemoryRouter>)
    expect(screen.getByText(/aguardando confirmação/i)).toBeInTheDocument()
  })

  it('shows form after PASSWORD_RECOVERY event fires', async () => {
    render(<MemoryRouter><ResetPassword /></MemoryRouter>)
    act(() => { authStateCallback!('PASSWORD_RECOVERY') })
    await waitFor(() => {
      expect(screen.getByLabelText(/nova senha/i)).toBeInTheDocument()
    })
  })

  it('shows error when passwords do not match', async () => {
    render(<MemoryRouter><ResetPassword /></MemoryRouter>)
    act(() => { authStateCallback!('PASSWORD_RECOVERY') })
    await waitFor(() => screen.getByLabelText(/nova senha/i))
    fireEvent.change(screen.getByLabelText(/nova senha/i), { target: { value: 'abc123' } })
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: 'different' } })
    fireEvent.click(screen.getByRole('button', { name: /salvar nova senha/i }))
    expect(screen.getByText(/senhas não coincidem/i)).toBeInTheDocument()
  })

  it('calls updateUser with the new password on valid submit', async () => {
    render(<MemoryRouter><ResetPassword /></MemoryRouter>)
    act(() => { authStateCallback!('PASSWORD_RECOVERY') })
    await waitFor(() => screen.getByLabelText(/nova senha/i))
    fireEvent.change(screen.getByLabelText(/nova senha/i), { target: { value: 'newpass123' } })
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: 'newpass123' } })
    fireEvent.click(screen.getByRole('button', { name: /salvar nova senha/i }))
    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'newpass123' })
    })
  })

  it('shows success message after password is updated', async () => {
    render(<MemoryRouter><ResetPassword /></MemoryRouter>)
    act(() => { authStateCallback!('PASSWORD_RECOVERY') })
    await waitFor(() => screen.getByLabelText(/nova senha/i))
    fireEvent.change(screen.getByLabelText(/nova senha/i), { target: { value: 'newpass123' } })
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: 'newpass123' } })
    fireEvent.click(screen.getByRole('button', { name: /salvar nova senha/i }))
    await waitFor(() => {
      expect(screen.getByText(/senha alterada com sucesso/i)).toBeInTheDocument()
    })
  })
})
