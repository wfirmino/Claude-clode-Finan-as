import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Login from '../../src/pages/Login'

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}))

import { supabase } from '../../src/lib/supabase'

function renderLogin() {
  return render(<MemoryRouter><Login /></MemoryRouter>)
}

describe('Login page', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders email and password fields', () => {
    renderLogin()
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
  })

  it('calls signInWithPassword on submit', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ data: { user: null, session: null }, error: null } as unknown as Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>)
    renderLogin()
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'user@test.com' } })
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: '123456',
      })
    })
  })

  it('shows error message on failed login', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockRejectedValue(new Error('Invalid'))
    renderLogin()
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'bad@test.com' } })
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => {
      expect(screen.getByText(/e-mail ou senha incorretos/i)).toBeInTheDocument()
    })
  })

  it('shows reset form when "Esqueci minha senha" is clicked', () => {
    renderLogin()
    fireEvent.click(screen.getByText(/esqueci minha senha/i))
    expect(screen.getByRole('button', { name: /enviar/i })).toBeInTheDocument()
  })
})
