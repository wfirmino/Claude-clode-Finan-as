import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../../hooks/useProfile'
import { supabase } from '../../lib/supabase'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { profile, updateProfile } = useProfile()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initials = profile?.name
    ? profile.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) return
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    await updateProfile({ avatar_url: data.publicUrl })
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white">
      <div className="px-5 pt-12 pb-12">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-gray-700 dark:text-white"
          aria-label="Voltar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Avatar + nome */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-[#2a2a2a] overflow-hidden flex items-center justify-center text-2xl font-bold">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                : initials}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-gray-300 dark:bg-[#333] rounded-full flex items-center justify-center"
              aria-label="Editar foto"
            >
              <svg className="w-4 h-4 text-gray-700 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          {profile?.name && (
            <h1 className="text-2xl font-bold">{profile.name}</h1>
          )}
        </div>

        {/* Geral */}
        <div className="mb-6">
          <p className="text-gray-500 text-sm mb-3 px-1">Geral</p>
          <button
            onClick={() => navigate('/settings/profile')}
            className="w-full bg-white dark:bg-[#1a1a1a] rounded-2xl px-4 py-4 flex items-center gap-4 hover:bg-gray-100 dark:hover:bg-[#222] transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="flex-1 text-left font-medium">Perfil</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Preferências */}
        <div className="mb-6">
          <p className="text-gray-500 text-sm mb-3 px-1">Preferências</p>
          <button
            onClick={() => navigate('/settings/preferences')}
            className="w-full bg-white dark:bg-[#1a1a1a] rounded-2xl px-4 py-4 flex items-center gap-4 hover:bg-gray-100 dark:hover:bg-[#222] transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
            <span className="flex-1 text-left font-medium">Preferências</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Segurança */}
        <div className="mb-8">
          <p className="text-gray-500 text-sm mb-3 px-1">Segurança</p>
          <button
            onClick={() => navigate('/settings/change-password')}
            className="w-full bg-white dark:bg-[#1a1a1a] rounded-2xl px-4 py-4 flex items-center gap-4 hover:bg-gray-100 dark:hover:bg-[#222] transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="flex-1 text-left font-medium">Alterar senha</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Sair */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-4 px-4 py-4 bg-white dark:bg-[#1a1a1a] rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="font-medium">Sair</span>
        </button>

      </div>
    </div>
  )
}
