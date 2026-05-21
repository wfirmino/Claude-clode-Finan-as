import { useState, useRef, useEffect } from 'react'
import type { Category } from '../types'

const PREDEFINED_GROUPS: { group: string; type: 'income' | 'expense'; items: string[] }[] = [
  { group: 'Alimentação', type: 'expense', items: ['Supermercado', 'Restaurantes e bares', 'Delivery', 'Alimentos e bebidas'] },
  { group: 'Compras', type: 'expense', items: ['Compras gerais', 'Compras online', 'Eletrônicos', 'Vestuário', 'Artigos esportivos', 'Papelaria'] },
  { group: 'Saúde e bem-estar', type: 'expense', items: ['Saúde', 'Academia', 'Farmácia', 'Dentista', 'Ótica'] },
  { group: 'Transporte', type: 'expense', items: ['Transporte público', 'Táxi e aplicativos', 'Combustível', 'Estacionamento', 'Manutenção de veículo'] },
  { group: 'Moradia', type: 'expense', items: ['Aluguel', 'Água', 'Eletricidade', 'Gás', 'Internet', 'Condomínio'] },
  { group: 'Lazer e entretenimento', type: 'expense', items: ['Lazer', 'Viagens', 'Hospedagem', 'Streaming', 'Bilhetes e ingressos'] },
  { group: 'Finanças', type: 'expense', items: ['Investimentos', 'Renda fixa', 'Poupança', 'Impostos e taxas'] },
  { group: 'Educação', type: 'expense', items: ['Cursos online', 'Universidade', 'Escola', 'Creche'] },
  { group: 'Receitas', type: 'income', items: ['Salário', 'Renda não-recorrente', 'Freelance'] },
]

interface Props {
  userCategories: Category[]
  displayName: string
  onChange: (name: string, categoryId: string, suggestedType?: 'income' | 'expense') => void
  transactionType: 'income' | 'expense'
}

export default function CategoryPicker({ userCategories, displayName, onChange, transactionType }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [customMode, setCustomMode] = useState(false)
  const [customText, setCustomText] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const customRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setSearch('')
      setCustomMode(false)
      setCustomText('')
      const t = setTimeout(() => searchRef.current?.focus(), 20)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (customMode) {
      const t = setTimeout(() => customRef.current?.focus(), 20)
      return () => clearTimeout(t)
    }
  }, [customMode])

  const q = search.toLowerCase()
  const userCatNames = new Set(userCategories.map(c => c.name.toLowerCase()))

  const filteredUserCats = userCategories.filter(c => c.name.toLowerCase().includes(q))

  const filteredGroups = PREDEFINED_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(item => item.toLowerCase().includes(q) && !userCatNames.has(item.toLowerCase())),
  })).filter(g => g.items.length > 0)

  const showOthers = !q || 'outros'.includes(q) || 'personalizado'.includes(q)

  function select(name: string, catId: string, suggestedType?: 'income' | 'expense') {
    onChange(name, catId, suggestedType)
    setOpen(false)
  }

  function submitCustom() {
    const name = customText.trim()
    if (!name) return
    onChange(name, '', transactionType)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full text-left px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        <span className={displayName ? 'text-gray-900' : 'text-gray-400'}>
          {displayName || 'Sem categoria'}
        </span>
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[48]" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[49] overflow-hidden"
            onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); e.stopPropagation() } }}
          >
            {/* Search */}
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Buscar categoria..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
            </div>

            {/* Options list */}
            <div className="max-h-60 overflow-y-auto">
              {/* Sem categoria */}
              {(!q || 'sem categoria'.includes(q)) && (
                <button
                  type="button"
                  onClick={() => select('', '', undefined)}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${!displayName ? 'text-indigo-700 font-medium bg-indigo-50' : 'text-gray-400'}`}
                >
                  <span>Sem categoria</span>
                  {!displayName && <span className="text-indigo-500 text-xs">✓</span>}
                </button>
              )}

              {/* User categories */}
              {filteredUserCats.length > 0 && (
                <>
                  <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-y border-gray-100">
                    Suas categorias
                  </div>
                  {filteredUserCats.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => select(cat.name, cat.id, cat.type)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color || '#6366f1' }} />
                      <span className="flex-1">{cat.name}</span>
                      <span className={`text-xs ${cat.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                        {cat.type === 'income' ? 'receita' : 'despesa'}
                      </span>
                    </button>
                  ))}
                </>
              )}

              {/* Predefined groups */}
              {filteredGroups.map(group => (
                <div key={group.group}>
                  <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-y border-gray-100">
                    {group.group}
                  </div>
                  {group.items.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => select(item, '', group.type)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ))}

              {/* Outros */}
              {showOthers && (
                <>
                  <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-y border-gray-100">
                    Outros
                  </div>
                  {!customMode ? (
                    <button
                      type="button"
                      onClick={() => setCustomMode(true)}
                      className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 flex items-center gap-2"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Digitar categoria personalizada...
                    </button>
                  ) : (
                    <div className="px-4 py-2.5 flex gap-2">
                      <input
                        ref={customRef}
                        type="text"
                        placeholder="Nome da categoria"
                        value={customText}
                        onChange={e => setCustomText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitCustom() } }}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                      <button
                        type="button"
                        onClick={submitCustom}
                        className="px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700"
                      >
                        OK
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* No results */}
              {filteredUserCats.length === 0 && filteredGroups.length === 0 && !showOthers && (
                <p className="px-4 py-6 text-sm text-gray-400 text-center">Nenhuma categoria encontrada</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
