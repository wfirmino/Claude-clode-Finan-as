# Settings Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar páginas de Configurações mobile (/settings, /settings/profile, /settings/change-password) com dark mode global via classe CSS no `<html>`.

**Architecture:** Tailwind `darkMode: 'class'` — `useTheme` aplica/remove a classe `dark` em `document.documentElement`. O `Layout.tsx` chama `useTheme()` para garantir a classe no mount. Páginas de settings são `md:hidden`, mobile-only. Desktop permanece inalterado visualmente.

**Tech Stack:** React, React Router DOM, Tailwind CSS, Supabase JS (`auth`, `storage`, `from('profiles')`)

---

## Task 1: Tailwind dark mode + useTheme aplicado ao DOM

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/hooks/useTheme.ts`

- [ ] **Step 1: Adicionar `darkMode: 'class'` ao Tailwind**

Substituir o conteúdo de `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: { extend: {} },
  plugins: [require('@tailwindcss/forms')],
}
```

- [ ] **Step 2: Atualizar `useTheme.ts` para aplicar classe `dark` ao DOM**

Substituir o conteúdo de `src/hooks/useTheme.ts`:

```ts
import { useState, useEffect } from 'react'

export type Theme = 'light' | 'dark' | 'auto'

function applyThemeClass(theme: Theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = theme === 'dark' || (theme === 'auto' && prefersDark)
  document.documentElement.classList.toggle('dark', isDark)
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('app-theme') as Theme) ?? 'dark'
  })

  useEffect(() => {
    applyThemeClass(theme)
    if (theme !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyThemeClass('auto')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const isDark =
    theme === 'dark' ||
    (theme === 'auto' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)

  function changeTheme(t: Theme) {
    setTheme(t)
    localStorage.setItem('app-theme', t)
  }

  return { theme, isDark, changeTheme }
}
```

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.js src/hooks/useTheme.ts
git commit -m "feat: dark mode global via classe CSS no html"
```

---

## Task 2: Layout.tsx — hamburguer + Drawer

**Files:**
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: Substituir o conteúdo de `src/components/Layout.tsx`**

```tsx
import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import TopNav from './TopNav'
import Drawer from './Drawer'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/transactions', label: 'Transações', end: false },
  { to: '/cartao', label: '💳 Cartão', end: false },
  { to: '/installments', label: 'Parcelamentos', end: false },
  { to: '/categories', label: 'Categorias', end: false },
  { to: '/goals', label: 'Metas', end: false },
  { to: '/reports', label: 'Relatórios', end: false },
]

export default function Layout() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  useTheme() // Garante classe dark/light no <html> ao montar

  async function handleSignOut() {
    try { await signOut() } catch (err) { console.error('Sign out error:', err) }
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex w-56 shrink-0 bg-white border-r border-gray-200 flex-col">
        <div className="px-6 py-5 border-b border-gray-200">
          <span className="text-lg font-bold text-indigo-600">FinanceApp</span>
        </div>
        <nav aria-label="Navegação principal" className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors text-left"
          >
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header + TopNav — mobile only */}
        <div className="md:hidden bg-white border-b border-gray-200">
          <div className="flex items-center px-4 py-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-1 -ml-1 text-gray-600 hover:text-gray-900"
              aria-label="Abrir menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="flex-1 text-center text-base font-bold text-indigo-600">FinanceApp</span>
          </div>
          <TopNav />
        </div>
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
```

- [ ] **Step 2: Verificar**

Iniciar o servidor (`npm run dev`) e no mobile (DevTools < 768px):
- ☰ aparece no canto esquerdo do header
- Clicar no ☰ abre o Drawer lateral
- Clicar no overlay fecha o Drawer
- Link "Configurações" no rodapé do Drawer navega para `/settings`

- [ ] **Step 3: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat: hamburger menu no header mobile com Drawer"
```

---

## Task 3: Página `/settings` — SettingsPage

**Files:**
- Create: `src/pages/settings/SettingsPage.tsx`

- [ ] **Step 1: Criar `src/pages/settings/SettingsPage.tsx`**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/settings/SettingsPage.tsx
git commit -m "feat: pagina /settings com avatar, tema e navegacao"
```

---

## Task 4: Página `/settings/profile` — ProfilePage

**Files:**
- Create: `src/pages/settings/ProfilePage.tsx`

- [ ] **Step 1: Criar `src/pages/settings/ProfilePage.tsx`**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/settings/ProfilePage.tsx
git commit -m "feat: pagina /settings/profile com campos e salvar"
```

---

## Task 5: Página `/settings/change-password` — ChangePasswordPage

**Files:**
- Create: `src/pages/settings/ChangePasswordPage.tsx`

- [ ] **Step 1: Criar `src/pages/settings/ChangePasswordPage.tsx`**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/settings/ChangePasswordPage.tsx
git commit -m "feat: pagina /settings/change-password com validacao e Supabase"
```

---

## Task 6: Rotas em App.tsx + verificação final

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Adicionar imports e rotas em `src/App.tsx`**

Substituir o conteúdo de `src/App.tsx`:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Installments from './pages/Installments'
import Categories from './pages/Categories'
import Goals from './pages/Goals'
import Reports from './pages/Reports'
import Cartao from './pages/Cartao'
import SettingsPage from './pages/settings/SettingsPage'
import ProfilePage from './pages/settings/ProfilePage'
import ChangePasswordPage from './pages/settings/ChangePasswordPage'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400 text-sm">
        Carregando...
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute user={user} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/cartao" element={<Cartao />} />
          <Route path="/installments" element={<Installments />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/profile" element={<ProfilePage />} />
          <Route path="/settings/change-password" element={<ChangePasswordPage />} />
        </Route>
      </Route>
      <Route path="*" element={
        <div className="flex flex-col items-center justify-center h-screen text-center">
          <p className="text-4xl font-bold text-gray-300 mb-2">404</p>
          <p className="text-gray-500 mb-4">Página não encontrada</p>
          <a href="/" className="text-indigo-600 text-sm hover:underline">Voltar ao início</a>
        </div>
      } />
    </Routes>
  )
}
```

- [ ] **Step 2: Verificação final no browser (mobile DevTools < 768px)**

Testar o fluxo completo:
1. ☰ abre Drawer → clicar "Configurações" → vai para `/settings` ✓
2. `/settings` mostra avatar (iniciais se sem foto), nome, seções Geral/Preferências/Segurança, botão Sair ✓
3. Clicar nos cards de tema (☀️/🌙/🖥️) — borda verde no selecionado, mudança visual imediata ✓
4. Clicar "Perfil" → vai para `/settings/profile` ✓
5. `/settings/profile` — preencher Nome e WhatsApp, clicar Salvar → Toast "Perfil atualizado!" ✓
6. E-mail aparece como read-only com ✅ ✓
7. Seta ← volta para `/settings` ✓
8. Clicar "Alterar senha" → `/settings/change-password` ✓
9. Campos com toggle de visibilidade funcionando ✓
10. Validação: senha < 8 chars mostra erro inline ✓
11. Validação: senhas diferentes mostra erro inline ✓
12. Desktop (> 768px): páginas `/settings*` mostram conteúdo vazio (md:hidden), sidebar intacta ✓

- [ ] **Step 3: Commit final**

```bash
git add src/App.tsx
git commit -m "feat: rotas /settings, /settings/profile e /settings/change-password"
```

---

## Nota: Bucket `avatars` no Supabase

O upload de avatar requer um bucket chamado `avatars` no Supabase Storage com acesso público. Se não existir, criar no painel Supabase → Storage → New bucket → nome: `avatars`, marcar "Public".
