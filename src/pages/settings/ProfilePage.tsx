import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../../hooks/useProfile'
import { supabase } from '../../lib/supabase'
import Toast from '../../components/Toast'

export default function ProfilePage() {
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
    } catch {
      setToast({ message: 'Erro ao salvar perfil.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      'Tem certeza que deseja excluir sua conta? Esta ação é irreversível.'
    )
    if (!confirmed) return
    const { error } = await supabase.rpc('delete_user')
    if (error) {
      setToast({
        message: 'Não foi possível excluir a conta. Entre em contato com o suporte.',
        type: 'error',
      })
      return
    }
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center md:hidden">
        <span className="text-gray-400 text-sm">Carregando...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#111] text-white md:hidden pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate('/settings')}
          className="p-1 -ml-1 text-gray-400 hover:text-white"
          aria-label="Voltar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold">Perfil</h1>
      </div>

      <div className="px-4 space-y-5">
        {/* Informações Pessoais */}
        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-3">
            Informações Pessoais
          </p>
          <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden divide-y divide-[#2a2a2a]">
            <div className="px-4 py-3">
              <label className="block text-xs text-gray-500 mb-1">Nome</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-transparent text-white text-sm outline-none placeholder-gray-600"
                placeholder="Seu nome completo"
              />
            </div>
            <div className="px-4 py-3">
              <label className="block text-xs text-gray-500 mb-1">Data de nascimento</label>
              <input
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                className="w-full bg-transparent text-white text-sm outline-none"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>
        </div>

        {/* Informações de Contato */}
        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-3">
            Informações de Contato
          </p>
          <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden divide-y divide-[#2a2a2a]">
            <div className="px-4 py-3">
              <label className="block text-xs text-gray-500 mb-1">E-mail</label>
              <div className="flex items-center justify-between gap-2">
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="flex-1 bg-transparent text-gray-400 text-sm outline-none"
                />
                <span className="text-base">✅</span>
              </div>
            </div>
            <div className="px-4 py-3">
              <label className="block text-xs text-gray-500 mb-1">WhatsApp</label>
              <input
                type="tel"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                className="w-full bg-transparent text-white text-sm outline-none placeholder-gray-600"
                placeholder="+55 11 99999-9999"
              />
            </div>
          </div>
        </div>

        {/* Salvar */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-[#22c55e] text-black font-semibold rounded-2xl hover:bg-[#16a34a] transition-colors disabled:opacity-60"
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>

        {/* Excluir conta */}
        <button
          onClick={handleDeleteAccount}
          className="w-full flex items-center justify-center gap-2 py-3 text-red-500 hover:text-red-400 transition-colors"
        >
          <span>🗑️</span>
          <span className="font-medium text-sm">Excluir conta</span>
        </button>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
