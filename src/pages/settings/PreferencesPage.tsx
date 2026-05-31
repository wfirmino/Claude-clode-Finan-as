import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme, Theme } from '../../hooks/useTheme'

const THEMES: { value: Theme; label: string; Icon: () => React.ReactElement }[] = [
  {
    value: 'light',
    label: 'Claro',
    Icon: () => (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Escuro',
    Icon: () => (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
      </svg>
    ),
  },
  {
    value: 'auto',
    label: 'Auto',
    Icon: () => (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
      </svg>
    ),
  },
]

export default function PreferencesPage() {
  const navigate = useNavigate()
  const { theme, changeTheme } = useTheme()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white">
      <div className="px-5 pt-12 pb-12">

        <button onClick={() => navigate('/settings')} className="mb-6 text-gray-700 dark:text-white" aria-label="Voltar">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h1 className="text-3xl font-bold mb-8">Preferências</h1>

        <p className="text-gray-500 text-sm mb-5">Aparência</p>

        <div className="grid grid-cols-3 gap-4">
          {THEMES.map(t => (
            <button
              key={t.value}
              onClick={() => changeTheme(t.value)}
              className={`flex flex-col items-center gap-3 py-6 rounded-2xl border transition-colors ${
                theme === t.value
                  ? 'border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]'
                  : 'border-gray-200 dark:border-[#2a2a2a] text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <t.Icon />
              <span className="text-sm font-medium">{t.label}</span>
            </button>
          ))}
        </div>

        <p className="text-gray-400 text-xs mt-6 px-1">
          "Auto" segue o tema do sistema operacional.
        </p>
      </div>
    </div>
  )
}
