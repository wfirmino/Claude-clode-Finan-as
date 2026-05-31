import { useState, useEffect, useRef } from 'react'
import type { Category, DatePreset } from '../types'

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'thisMonth', label: 'Este mês' },
  { key: 'last30', label: 'Últimos 30 dias' },
  { key: 'last90', label: 'Últimos 90 dias' },
  { key: 'lastMonth', label: 'Mês passado' },
  { key: 'last6months', label: 'Últimos 6 meses' },
  { key: 'thisYear', label: 'Este ano' },
  { key: 'lastYear', label: 'Ano passado' },
  { key: '', label: 'Todo período' },
  { key: 'custom', label: 'Personalizado' },
]

export interface MobileFilters {
  datePreset: DatePreset
  customStartDate: string
  customEndDate: string
  typeFilter: '' | 'income' | 'expense'
  categoryFilter: string
}

interface Props {
  open: boolean
  onClose: () => void
  current: MobileFilters
  onApply: (filters: MobileFilters) => void
  categories: Category[]
}

export default function MobileFilterSheet({ open, onClose, current, onApply, categories }: Props) {
  const [draft, setDraft] = useState<MobileFilters>(current)
  const currentRef = useRef(current)
  currentRef.current = current

  useEffect(() => {
    if (open) setDraft(currentRef.current)
  }, [open])

  if (!open) return null

  function handleClear() {
    setDraft({ datePreset: 'thisMonth', customStartDate: '', customEndDate: '', typeFilter: '', categoryFilter: '' })
  }

  function handleApply() {
    onApply(draft)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filtros"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#1a1a1a] rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-[#2a2a2a] flex-shrink-0">
          <span className="text-lg font-bold text-gray-900 dark:text-white">Filtros</span>
          <button onClick={handleClear} className="text-sm font-medium text-indigo-600 active:opacity-70">
            Limpar todos
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* Período */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">Período</h3>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setDraft(d => ({ ...d, datePreset: p.key }))}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                    draft.datePreset === p.key
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-[#2a2a2a] active:bg-gray-50 dark:active:bg-[#2a2a2a]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {draft.datePreset === 'custom' && (
              <div className="mt-3 flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 dark:text-gray-500 block mb-1">De</label>
                  <input
                    type="date"
                    value={draft.customStartDate}
                    onChange={e => setDraft(d => ({ ...d, customStartDate: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#111] text-sm text-gray-800 dark:text-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400 dark:text-gray-500 block mb-1">Até</label>
                  <input
                    type="date"
                    value={draft.customEndDate}
                    onChange={e => setDraft(d => ({ ...d, customEndDate: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#111] text-sm text-gray-800 dark:text-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
            )}
          </section>

          {/* Tipo de Transação */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">Tipo de Transação</h3>
            <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-[#2a2a2a]">
              {(
                [
                  { value: '' as const, label: 'Todas' },
                  { value: 'expense' as const, label: 'Despesas' },
                  { value: 'income' as const, label: 'Receitas' },
                ] as const
              ).map((opt, i) => (
                <button
                  key={opt.value}
                  onClick={() => setDraft(d => ({ ...d, typeFilter: opt.value }))}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                    i > 0 ? 'border-l border-gray-200 dark:border-[#2a2a2a]' : ''
                  } ${
                    draft.typeFilter === opt.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-50 dark:bg-[#111] text-gray-600 dark:text-gray-400 active:bg-gray-100 dark:active:bg-[#2a2a2a]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Categoria */}
          {categories.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">Categoria</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setDraft(d => ({ ...d, categoryFilter: '' }))}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                    draft.categoryFilter === ''
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-[#2a2a2a] active:bg-gray-50 dark:active:bg-[#2a2a2a]'
                  }`}
                >
                  Todas
                </button>
                {categories.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setDraft(d => ({ ...d, categoryFilter: c.id }))}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 ${
                      draft.categoryFilter === c.id
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 active:bg-gray-50'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: draft.categoryFilter === c.id
                          ? 'rgba(255,255,255,0.7)'
                          : (c.color || '#6366f1'),
                      }}
                    />
                    {c.name}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Bottom actions */}
        <div className="flex gap-3 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-gray-100 dark:border-[#2a2a2a] flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#2a2a2a] active:bg-gray-200 dark:active:bg-[#333] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 active:bg-indigo-700 transition-colors"
          >
            Aplicar filtros
          </button>
        </div>
      </div>
    </>
  )
}
