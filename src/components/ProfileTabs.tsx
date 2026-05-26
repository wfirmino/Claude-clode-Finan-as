import type { Perfil } from '../types'

const TABS: { key: Perfil; label: string }[] = [
  { key: 'pessoal', label: 'Pessoal' },
  { key: 'empresarial', label: 'Empresarial' },
  { key: 'kommo', label: 'Kommo' },
]

interface Props {
  active: Perfil
  onChange: (perfil: Perfil) => void
}

export default function ProfileTabs({ active, onChange }: Props) {
  return (
    <div role="tablist" className="flex border-b border-gray-200 mb-4">
      {TABS.map(({ key, label }) => (
        <button
          key={key}
          role="tab"
          aria-selected={active === key}
          onClick={() => onChange(key)}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            active === key
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
