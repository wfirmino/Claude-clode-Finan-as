import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Toast from '../../components/Toast'

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  async function handleSubmit() {
    setError('')
    if (newPassword.length < 8) {
      setError('A nova senha deve ter ao menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('Usuário não encontrado')
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (signInError) {
        setError('Senha atual incorreta.')
        return
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError
      setToast({ message: 'Senha alterada com sucesso!', type: 'success' })
      setTimeout(() => navigate('/settings'), 1800)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao alterar senha.'
      setToast({ message: msg, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#111] text-white md:hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-2">
        <button
          onClick={() => navigate('/settings')}
          className="p-1 -ml-1 text-gray-400 hover:text-white"
          aria-label="Voltar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold leading-tight">Trocar senha</h1>
        </div>
      </div>
      <p className="px-4 text-xs text-gray-500 mb-6">
        Use 8 ou mais caracteres com uma mistura de letras, números e símbolos.
      </p>

      <div className="px-4 flex-1 space-y-4">
        {/* Senha atual */}
        <div className="bg-[#1a1a1a] rounded-2xl px-4 py-3">
          <label className="block text-xs text-gray-500 mb-1">Senha atual</label>
          <input
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            className="w-full bg-transparent text-white text-sm outline-none placeholder-gray-600"
            placeholder="••••••••"
          />
        </div>

        {/* Nova senha */}
        <div className="bg-[#1a1a1a] rounded-2xl px-4 py-3">
          <label className="block text-xs text-gray-500 mb-1">Nova senha</label>
          <div className="flex items-center gap-2">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-600"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowNew(v => !v)}
              className="text-gray-500 hover:text-gray-300"
              aria-label={showNew ? 'Ocultar senha' : 'Mostrar senha'}
            >
              <EyeIcon open={showNew} />
            </button>
          </div>
        </div>

        {/* Confirmar nova senha */}
        <div className="bg-[#1a1a1a] rounded-2xl px-4 py-3">
          <label className="block text-xs text-gray-500 mb-1">Confirme a nova senha</label>
          <div className="flex items-center gap-2">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-600"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(v => !v)}
              className="text-gray-500 hover:text-gray-300"
              aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
            >
              <EyeIcon open={showConfirm} />
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500 px-1">Ao menos 8 caracteres</p>

        {error && (
          <p className="text-sm text-red-400 px-1">{error}</p>
        )}
      </div>

      {/* Botão fixo no rodapé */}
      <div className="sticky bottom-0 px-4 py-4 bg-[#111]">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-4 bg-[#22c55e] text-black font-semibold rounded-2xl hover:bg-[#16a34a] transition-colors disabled:opacity-60"
        >
          {loading ? 'Alterando...' : 'Trocar Senha'}
        </button>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
