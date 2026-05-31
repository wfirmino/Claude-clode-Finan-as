import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Toast from '../../components/Toast'

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
    if (newPassword.length < 8) { setError('A nova senha deve ter ao menos 8 caracteres.'); return }
    if (newPassword !== confirmPassword) { setError('As senhas não coincidem.'); return }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('Usuário não encontrado')
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
      if (signInError) { setError('Senha atual incorreta.'); return }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError
      setToast({ message: 'Senha alterada com sucesso!', type: 'success' })
      setTimeout(() => navigate('/settings'), 1800)
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : 'Erro ao alterar senha.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const fieldClass = "bg-white dark:bg-[#1a1a1a] rounded-2xl px-4 py-4 border border-gray-200 dark:border-[#2a2a2a]"
  const inputClass = "flex-1 bg-transparent text-gray-900 dark:text-white outline-none placeholder-gray-400 dark:placeholder-gray-500"
  const eyeClass = "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"

  const EyeOpen = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
  const EyeOff = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white flex flex-col">
      <div className="px-5 pt-12 flex-1">

        <button onClick={() => navigate('/settings')} className="mb-6 text-gray-700 dark:text-white" aria-label="Voltar">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h1 className="text-3xl font-bold mb-2">Trocar senha</h1>
        <p className="text-gray-500 text-sm mb-8">Use 8 ou mais caracteres com uma mistura de letras, números e símbolos</p>

        <div className={`${fieldClass} mb-4`}>
          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
            className={`w-full bg-transparent text-gray-900 dark:text-white outline-none placeholder-gray-400 dark:placeholder-gray-500`}
            placeholder="Senha atual" />
        </div>

        <div className={`${fieldClass} mb-4 flex items-center gap-2`}>
          <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
            className={inputClass} placeholder="Nova senha" />
          <button type="button" onClick={() => setShowNew(v => !v)} className={eyeClass}>
            {showNew ? <EyeOpen /> : <EyeOff />}
          </button>
        </div>

        <div className={`${fieldClass} mb-3 flex items-center gap-2`}>
          <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
            className={inputClass} placeholder="Confirme a nova senha" />
          <button type="button" onClick={() => setShowConfirm(v => !v)} className={eyeClass}>
            {showConfirm ? <EyeOpen /> : <EyeOff />}
          </button>
        </div>

        <p className="text-gray-500 text-sm px-1">Ao menos 8 caracteres</p>
        {error && <p className="text-red-500 text-sm px-1 mt-2">{error}</p>}
      </div>

      <div className="px-5 py-6">
        <button onClick={handleSubmit} disabled={loading}
          className="w-full py-4 bg-indigo-600 dark:bg-[#333] text-white font-semibold rounded-full hover:bg-indigo-700 dark:hover:bg-[#444] transition-colors disabled:opacity-60">
          {loading ? 'Alterando...' : 'Trocar Senha'}
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
