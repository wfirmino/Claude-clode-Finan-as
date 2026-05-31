import { useNavigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'

interface Props {
  open: boolean
  onClose: () => void
}

export default function Drawer({ open, onClose }: Props) {
  const navigate = useNavigate()
  const { profile } = useProfile()

  const initials = profile?.name
    ? profile.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 right-0 w-full bg-[#111] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-12 pb-4">
          <span className="text-white font-bold text-xl">FinanceApp</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Fechar menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Banner */}
        <div className="mx-5 mb-4 rounded-2xl overflow-hidden flex bg-indigo-900 min-h-[120px]">
          <div className="w-1/2 p-5 flex flex-col justify-center">
            <p className="text-white font-bold text-base leading-tight">Bem-vindo ao FinanceApp</p>
            <p className="text-indigo-300 text-sm mt-2">Controle suas finanças</p>
          </div>
          <div className="w-1/2 bg-indigo-700 flex items-center justify-center text-5xl select-none">
            💰
          </div>
        </div>

        <div className="flex-1" />

        {/* Footer — user + gear */}
        <div className="border-t border-white/10 p-4">
          <button
            onClick={() => { onClose(); navigate('/settings') }}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-[#333] overflow-hidden flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                : initials}
            </div>
            <span className="flex-1 text-white font-medium text-sm text-left truncate">
              {profile?.name ?? 'Usuário'}
            </span>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
