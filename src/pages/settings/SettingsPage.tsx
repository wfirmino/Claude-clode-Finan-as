import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../../hooks/useProfile'
import { useTheme, Theme } from '../../hooks/useTheme'
import { supabase } from '../../lib/supabase'

const THEMES: { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: 'Claro', icon: '☀️' },
  { value: 'dark', label: 'Escuro', icon: '🌙' },
  { value: 'auto', label: 'Auto', icon: '🖥️' },
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const { profile, updateProfile } = useProfile()
  const { theme, changeTheme } = useTheme()
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
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (uploadError) { console.error(uploadError); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    await updateProfile({ avatar_url: data.publicUrl })
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#111] text-white md:hidden">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-center">Configurações</h1>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center pb-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-[#2a2a2a] overflow-hidden flex items-center justify-center text-2xl font-bold text-white">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 bg-[#22c55e] rounded-full flex items-center justify-center shadow-md"
            aria-label="Editar foto de perfil"
          >
            <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        {profile?.name && (
          <p className="mt-3 text-lg font-semibold">{profile.name}</p>
        )}
      </div>

      <div className="px-4 space-y-5 pb-10">
        {/* Geral */}
        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-2">Geral</p>
          <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden">
            <button
              onClick={() => navigate('/settings/profile')}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">👤</span>
                <span className="text-sm font-medium">Perfil</span>
              </div>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Preferências */}
        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-2">Preferências</p>
          <div className="bg-[#1a1a1a] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🎨</span>
              <span className="text-sm font-medium">Aparência</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map(t => (
                <button
                  key={t.value}
                  onClick={() => changeTheme(t.value)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-medium transition-colors ${
                    theme === t.value
                      ? 'border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]'
                      : 'border-[#2a2a2a] text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <span className="text-lg">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Segurança */}
        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-2">Segurança</p>
          <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden">
            <button
              onClick={() => navigate('/settings/change-password')}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🔒</span>
                <span className="text-sm font-medium">Alterar senha</span>
              </div>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Sair */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-4 bg-[#1a1a1a] rounded-2xl text-red-500 hover:bg-red-500/10 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </div>
  )
}
