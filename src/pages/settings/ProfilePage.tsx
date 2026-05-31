import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../../hooks/useProfile'
import { useTheme } from '../../hooks/useTheme'
import { supabase } from '../../lib/supabase'
import Toast from '../../components/Toast'

export default function ProfilePage() {
  useTheme()
  const navigate = useNavigate()
  const { profile, loading, updateProfile } = useProfile()
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '')
      setBirthDate(profile.birth_date ?? '')
      setWhatsapp(profile.whatsapp ?? '')
    }
  }, [profile])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email)
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await updateProfile({ name: name || null, birth_date: birthDate || null, whatsapp: whatsapp || null })
      setToast({ message: 'Perfil atualizado!', type: 'success' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      setToast({ message: msg || 'Erro ao salvar perfil.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm('Tem certeza que deseja excluir sua conta? Esta ação é irreversível.')
    if (!confirmed) return
    const { error } = await supabase.rpc('delete_user')
    if (error) { setToast({ message: 'Não foi possível excluir a conta.', type: 'error' }); return }
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <span className="text-gray-400 text-sm">Carregando...</span>
      </div>
    )
  }

  const inputClass = "w-full bg-transparent text-gray-900 dark:text-white outline-none placeholder-gray-400 dark:placeholder-gray-600"
  const fieldClass = "bg-white dark:bg-[#1a1a1a] rounded-2xl px-4 py-4 border border-gray-200 dark:border-[#2a2a2a]"

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white">
      <div className="px-5 pt-12 pb-12">

        {/* Back */}
        <button onClick={() => navigate('/settings')} className="mb-6 text-gray-700 dark:text-white" aria-label="Voltar">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h1 className="text-3xl font-bold mb-8">Perfil</h1>

        {/* Informações Pessoais */}
        <p className="text-gray-500 text-sm mb-5">Informações Pessoais</p>

        <div className="mb-5">
          <p className="font-semibold mb-2">Nome</p>
          <div className={fieldClass}>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className={inputClass} placeholder="Seu nome completo" />
          </div>
        </div>

        <div className="mb-10">
          <p className="font-semibold mb-2">Data de nascimento</p>
          <div className={fieldClass}>
            <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
              className={inputClass} style={{ colorScheme: 'dark' }} />
          </div>
        </div>

        {/* Informações de Contato */}
        <p className="text-gray-500 text-sm mb-5">Informações de contato</p>

        <div className="mb-5">
          <p className="font-semibold mb-2">E-mail</p>
          <div className={`${fieldClass} flex items-center gap-2`}>
            <input type="email" value={email} readOnly className="flex-1 bg-transparent text-gray-400 outline-none" />
            {email && (
              <svg className="w-5 h-5 text-[#22c55e] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
        </div>

        <div className="mb-10">
          <p className="font-semibold mb-2">Whatsapp</p>
          <div className={`${fieldClass} flex items-center gap-2`}>
            <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
              className={`flex-1 bg-transparent text-gray-900 dark:text-white outline-none placeholder-gray-400 dark:placeholder-gray-600`}
              placeholder="+55 11 99999-9999" />
            {whatsapp && (
              <svg className="w-5 h-5 text-[#22c55e] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full py-4 bg-[#22c55e] text-black font-semibold rounded-2xl hover:bg-[#16a34a] transition-colors disabled:opacity-60 mb-4">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>

        <button onClick={handleDeleteAccount} className="flex items-center gap-2 text-red-500 hover:text-red-400 transition-colors py-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="font-medium text-sm">Excluir conta</span>
        </button>

      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
