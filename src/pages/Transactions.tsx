import { useState, useRef, useMemo } from 'react'
import { useTransactions, type TransactionFilters } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import type { Transaction } from '../types'
import { formatCurrency, formatDate } from '../utils/formatters'
import { getErrorMessage } from '../utils/errors'
import Toast from '../components/Toast'
import Modal from '../components/Modal'
import CategoryPicker from '../components/CategoryPicker'
import TransactionSheet from '../components/TransactionSheet'

interface FormState {
  title: string
  amount: string
  category_id: string        // ID de categoria existente do usuário, ou '' se pendente/nenhuma
  category_display_name: string  // nome exibido no picker
  type: 'income' | 'expense'
  date: string
  notes: string
}

const defaultForm: FormState = {
  title: '', amount: '', category_id: '', category_display_name: '', type: 'expense',
  date: new Date().toISOString().split('T')[0], notes: '',
}

const PAGE_SIZE = 10

type DatePreset = '' | 'last30' | 'last90' | 'thisMonth' | 'lastMonth' | 'last6months' | 'thisYear' | 'lastYear' | 'custom'
type SortBy = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: '', label: 'Todo período' },
  { key: 'last30', label: 'Últimos 30 dias' },
  { key: 'last90', label: 'Últimos 90 dias' },
  { key: 'thisMonth', label: 'Este mês' },
  { key: 'lastMonth', label: 'Mês passado' },
  { key: 'last6months', label: 'Últimos 6 meses' },
  { key: 'thisYear', label: 'Este ano' },
  { key: 'lastYear', label: 'Ano passado' },
]

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: 'date-desc', label: 'Data (mais recentes)' },
  { key: 'date-asc', label: 'Data (mais antigas)' },
  { key: 'amount-desc', label: 'Valor (maior primeiro)' },
  { key: 'amount-asc', label: 'Valor (menor primeiro)' },
]

function getDateRange(preset: DatePreset): { startDate?: string; endDate?: string } {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  switch (preset) {
    case '': return {}
    case 'last30': {
      const s = new Date(today); s.setDate(today.getDate() - 30)
      return { startDate: fmt(s), endDate: fmt(today) }
    }
    case 'last90': {
      const s = new Date(today); s.setDate(today.getDate() - 90)
      return { startDate: fmt(s), endDate: fmt(today) }
    }
    case 'thisMonth': {
      const s = new Date(today.getFullYear(), today.getMonth(), 1)
      const e = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { startDate: fmt(s), endDate: fmt(e) }
    }
    case 'lastMonth': {
      const s = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const e = new Date(today.getFullYear(), today.getMonth(), 0)
      return { startDate: fmt(s), endDate: fmt(e) }
    }
    case 'last6months': {
      const s = new Date(today); s.setMonth(today.getMonth() - 6)
      return { startDate: fmt(s), endDate: fmt(today) }
    }
    case 'thisYear':
      return { startDate: `${today.getFullYear()}-01-01`, endDate: `${today.getFullYear()}-12-31` }
    case 'lastYear': {
      const y = today.getFullYear() - 1
      return { startDate: `${y}-01-01`, endDate: `${y}-12-31` }
    }
    default: return {}
  }
}

export default function Transactions() {
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth')
  const [showDateDropdown, setShowDateDropdown] = useState(false)
  const [customPanelOpen, setCustomPanelOpen] = useState(false)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [sortBy, setSortBy] = useState<SortBy>('date-desc')
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [typeFilter, setTypeFilter] = useState<'' | 'income' | 'expense'>('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const filters = useMemo<TransactionFilters>(() => {
    const range = datePreset === 'custom'
      ? { startDate: customStartDate || undefined, endDate: customEndDate || undefined }
      : getDateRange(datePreset)
    return {
      ...range,
      type: (typeFilter === 'income' || typeFilter === 'expense') ? typeFilter : undefined,
      categoryId: categoryFilter || undefined,
    }
  }, [datePreset, customStartDate, customEndDate, typeFilter, categoryFilter])

  const { transactions, loading, error, createTransaction, updateTransaction, deleteTransaction } = useTransactions(filters)
  const { categories, createCategory } = useCategories()
  const [modal, setModal] = useState<{ open: boolean; editing: Transaction | null }>({ open: false, editing: null })
  const [form, setForm] = useState<FormState>(defaultForm)
  const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sheetTx, setSheetTx] = useState<Transaction | null>(null)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const toastId = useRef(0)

  const { totalIncome, totalExpense, balance } = useMemo(() => {
    let income = 0, expense = 0
    for (const t of transactions) {
      if (t.type === 'income') income += t.amount
      else expense += t.amount
    }
    return { totalIncome: income, totalExpense: expense, balance: income - expense }
  }, [transactions])

  const filteredTransactions = useMemo(() => {
    let arr = transactions
    if (search.trim()) {
      const q = search.toLowerCase()
      arr = arr.filter(t => t.title.toLowerCase().includes(q) || (t.categories?.name ?? '').toLowerCase().includes(q))
    }
    const sorted = [...arr]
    switch (sortBy) {
      case 'date-asc': sorted.sort((a, b) => a.date.localeCompare(b.date)); break
      case 'amount-desc': sorted.sort((a, b) => b.amount - a.amount); break
      case 'amount-asc': sorted.sort((a, b) => a.amount - b.amount); break
      default: sorted.sort((a, b) => b.date.localeCompare(a.date))
    }
    return sorted
  }, [transactions, search, sortBy])

  const paginated = filteredTransactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE)

  const selectedPresetLabel = datePreset === 'custom'
    ? (customStartDate || customEndDate ? `${customStartDate || '…'} → ${customEndDate || '…'}` : 'Período personalizado')
    : (DATE_PRESETS.find(p => p.key === datePreset)?.label ?? 'Este mês')
  const selectedSortLabel = SORT_OPTIONS.find(s => s.key === sortBy)?.label ?? 'Data (mais recentes)'

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ id: ++toastId.current, message, type })
  }

  function openCreate() {
    setForm({ ...defaultForm, date: new Date().toISOString().split('T')[0] })
    setModal({ open: true, editing: null })
  }

  function openEdit(t: Transaction) {
    setForm({
      title: t.title,
      amount: String(t.amount),
      category_id: t.category_id ?? '',
      category_display_name: t.categories?.name ?? '',
      type: t.type,
      date: t.date,
      notes: t.notes ?? '',
    })
    setModal({ open: true, editing: t })
  }

  function closeModal() { setModal({ open: false, editing: null }) }

  function handleCategorySelect(name: string, catId: string, suggestedType?: 'income' | 'expense') {
    setForm(f => ({
      ...f,
      category_id: catId,
      category_display_name: name,
      type: suggestedType ?? f.type,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) {
      showToast('Informe um valor numérico maior que zero.', 'error')
      return
    }
    setSubmitting(true)
    try {
      // Resolve category: if pending name, find existing or create new
      let resolvedCategoryId: string | null = form.category_id || null
      if (!resolvedCategoryId && form.category_display_name) {
        const existing = categories.find(c => c.name.toLowerCase() === form.category_display_name.toLowerCase())
        if (existing) {
          resolvedCategoryId = existing.id
        } else {
          resolvedCategoryId = await createCategory({ name: form.category_display_name, type: form.type, color: '#6366f1' })
        }
      }

      const values = {
        title: form.title,
        amount,
        category_id: resolvedCategoryId,
        type: form.type,
        date: form.date,
        notes: form.notes || null,
      }

      if (modal.editing) {
        await updateTransaction(modal.editing.id, values)
        showToast('Transação atualizada.', 'success')
      } else {
        await createTransaction(values)
        showToast('Transação criada.', 'success')
      }
      closeModal()
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    setConfirmDelete(null)
    try {
      await deleteTransaction(id)
      showToast('Transação excluída.', 'success')
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    }
  }

  return (
    <div className="bg-white min-h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 md:mb-6">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar transações..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            className="pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent w-full"
          />
        </div>
        <button onClick={openCreate} className="flex-shrink-0 flex items-center gap-1.5 px-3 md:px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <span className="text-base leading-none">+</span><span className="hidden md:inline ml-1">Nova Transação</span>
        </button>
      </div>

      {/* Mobile filter button — hidden on desktop */}
      <button
        onClick={() => setShowMobileFilters(v => !v)}
        className="md:hidden w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white mb-3"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
        </svg>
        Filtros
        {(typeFilter !== '' || categoryFilter !== '') && (
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-semibold">
            {[typeFilter !== '', categoryFilter !== ''].filter(Boolean).length}
          </span>
        )}
      </button>
      {showMobileFilters && (
        <div className="md:hidden flex flex-col gap-2 mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <select
            value={datePreset}
            onChange={e => { setDatePreset(e.target.value as DatePreset); setPage(0) }}
            className="w-full rounded-lg border-gray-300 text-sm pl-3 pr-8 py-2 bg-white"
          >
            {DATE_PRESETS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value as '' | 'income' | 'expense'); setPage(0) }}
            className="w-full rounded-lg border-gray-300 text-sm pl-3 pr-8 py-2 bg-white"
          >
            <option value="">Todos os tipos</option>
            <option value="income">Receita</option>
            <option value="expense">Despesa</option>
          </select>
          <select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setPage(0) }}
            className="w-full rounded-lg border-gray-300 text-sm pl-3 pr-8 py-2 bg-white"
          >
            <option value="">Todas as categorias</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={sortBy}
            onChange={e => { setSortBy(e.target.value as SortBy); setPage(0) }}
            className="w-full rounded-lg border-gray-300 text-sm pl-3 pr-8 py-2 bg-white"
          >
            {SORT_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      )}

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          Erro ao carregar transações: {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">

        <div className="bg-green-50 rounded-xl border border-green-100 px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Receitas</span>
          </div>
          <p className="text-2xl font-bold text-green-600 tabular-nums">{formatCurrency(totalIncome)}</p>
          <p className="text-xs text-green-500 mt-1">{transactions.filter(t => t.type === 'income').length} lançamentos</p>
        </div>

        <div className="bg-red-50 rounded-xl border border-red-100 px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">Despesas</span>
          </div>
          <p className="text-2xl font-bold text-red-600 tabular-nums">{formatCurrency(totalExpense)}</p>
          <p className="text-xs text-red-400 mt-1">{transactions.filter(t => t.type === 'expense').length} lançamentos</p>
        </div>

        <div className={`rounded-xl border px-5 py-4 col-span-2 md:col-span-1 ${balance >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            <svg className={`w-4 h-4 shrink-0 ${balance >= 0 ? 'text-green-500' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className={`text-xs font-semibold uppercase tracking-wide ${balance >= 0 ? 'text-green-600' : 'text-red-400'}`}>Saldo</span>
          </div>
          <p className={`text-2xl font-bold tabular-nums ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(Math.abs(balance))}</p>
          <p className={`text-xs mt-1 ${balance >= 0 ? 'text-green-500' : 'text-red-400'}`}>{balance >= 0 ? 'positivo' : 'negativo'}</p>
        </div>
      </div>

      {transactions.length >= 500 && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Mostrando os 500 registros mais recentes.
        </div>
      )}

      {/* Filter bar — hidden on mobile (use filter button above instead) */}
      <div className="hidden md:flex flex-wrap items-center gap-3 mb-5">
        {/* Date preset */}
        <div className="relative">
          <button
            onClick={() => { setShowDateDropdown(v => !v); setCustomPanelOpen(false) }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="max-w-[160px] truncate">{selectedPresetLabel}</span>
            <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showDateDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => { setShowDateDropdown(false); setCustomPanelOpen(false) }} />
              <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg border border-gray-200 shadow-lg z-20 py-1">
                {!customPanelOpen ? (
                  <>
                    {DATE_PRESETS.map(p => (
                      <button
                        key={p.key}
                        onClick={() => { setDatePreset(p.key); setShowDateDropdown(false); setPage(0) }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${datePreset === p.key ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        {p.label}
                      </button>
                    ))}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={() => setCustomPanelOpen(true)}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 ${datePreset === 'custom' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Período personalizado
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-3">
                      <button onClick={() => setCustomPanelOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="text-xs font-semibold text-gray-600">Período personalizado</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-gray-400 block mb-0.5">De</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={e => setCustomStartDate(e.target.value)}
                          className="w-full rounded border border-gray-200 text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-0.5">Até</label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={e => setCustomEndDate(e.target.value)}
                          className="w-full rounded border border-gray-200 text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setCustomPanelOpen(false)}
                          className="flex-1 py-1.5 text-xs text-gray-500 border border-gray-200 rounded hover:bg-gray-50"
                        >
                          Voltar
                        </button>
                        <button
                          onClick={() => { setDatePreset('custom'); setShowDateDropdown(false); setCustomPanelOpen(false); setPage(0) }}
                          className="flex-1 py-1.5 text-xs text-white bg-indigo-600 rounded hover:bg-indigo-700 font-medium"
                        >
                          Aplicar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value as '' | 'income' | 'expense'); setPage(0) }}
          className="rounded-lg border-gray-300 text-sm pl-3 pr-8 py-2"
        >
          <option value="">Todos os tipos</option>
          <option value="income">Receita</option>
          <option value="expense">Despesa</option>
        </select>

        {/* Category filter */}
        <div className="relative">
          <button
            onClick={() => setShowCategoryDropdown(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <span>{categoryFilter ? (categories.find(c => c.id === categoryFilter)?.name ?? 'Todas as categorias') : 'Todas as categorias'}</span>
            <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showCategoryDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowCategoryDropdown(false)} />
              <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-lg border border-gray-200 shadow-lg z-20 py-1 max-h-60 overflow-y-auto">
                <button
                  onClick={() => { setCategoryFilter(''); setShowCategoryDropdown(false); setPage(0) }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${!categoryFilter ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  Todas as categorias
                </button>
                {categories.length === 0 && (
                  <p className="px-4 py-3 text-xs text-gray-400">Nenhuma categoria cadastrada</p>
                )}
                {categories.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setCategoryFilter(c.id); setShowCategoryDropdown(false); setPage(0) }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 ${categoryFilter === c.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color || '#6366f1' }} />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className={`text-xs ${c.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                      {c.type === 'income' ? 'receita' : 'despesa'}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative ml-auto">
          <button
            onClick={() => setShowSortDropdown(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            {selectedSortLabel}
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showSortDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSortDropdown(false)} />
              <div className="absolute top-full right-0 mt-1 w-52 bg-white rounded-lg border border-gray-200 shadow-lg z-20 py-1">
                {SORT_OPTIONS.map(s => (
                  <button
                    key={s.key}
                    onClick={() => { setSortBy(s.key); setShowSortDropdown(false); setPage(0) }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${sortBy === s.key ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile card list — hidden on desktop */}
      {!loading && (
        <div className="md:hidden space-y-3 mb-4">
          {paginated.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma transação encontrada</p>
          )}
          {paginated.map(t => (
            <button
              key={t.id}
              onClick={() => setSheetTx(t)}
              className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 space-y-2"
            >
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>{formatDate(t.date)}</span>
                <span>⋮</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-lg flex-shrink-0">
                  {t.type === 'income' ? '💰' : '💸'}
                </div>
                <span className="text-sm font-semibold text-gray-900">{t.title}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.type === 'income' ? 'bg-green-50 text-green-700' : 'bg-indigo-50 text-indigo-700'}`}>
                  {t.categories?.name ?? '—'}
                </span>
                <span className={`text-sm font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            </button>
          ))}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-sm text-indigo-600 disabled:opacity-40">← Anterior</button>
              <span className="text-sm text-gray-500">{page + 1} / {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="text-sm text-indigo-600 disabled:opacity-40">Próxima →</button>
            </div>
          )}
        </div>
      )}

      {/* Transaction table */}
      {loading ? (
        <p className="text-sm text-gray-400 py-4">Carregando...</p>
      ) : (
        <div className="hidden md:block rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Data', 'Título', 'Categoria', 'Tipo', 'Valor', ''].map((h, i) => (
                  <th key={i} className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <p className="text-gray-400 text-base">Nenhuma transação encontrada</p>
                  </td>
                </tr>
              )}
              {paginated.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{formatDate(t.date)}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{t.title}</td>
                  <td className="px-6 py-4 text-gray-500">{t.categories?.name ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${t.type === 'income' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {t.type === 'income' ? 'Receita' : 'Despesa'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 font-semibold tabular-nums ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </td>
                  <td className="px-6 py-4">
                    {confirmDelete === t.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">Confirmar?</span>
                        <button onClick={() => handleDelete(t.id)} className="text-red-600 text-xs font-medium hover:underline">Sim</button>
                        <button onClick={() => setConfirmDelete(null)} className="text-gray-500 text-xs hover:underline">Não</button>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button onClick={() => openEdit(t)} aria-label={`Editar transação ${t.title}`} className="text-indigo-600 text-sm font-medium hover:underline">Editar</button>
                        <button onClick={() => setConfirmDelete(t.id)} aria-label={`Excluir transação ${t.title}`} className="text-red-500 text-sm font-medium hover:underline">Excluir</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-sm text-indigo-600 disabled:opacity-40 hover:text-indigo-800 transition-colors">← Anterior</button>
              <span className="text-sm text-gray-500">{page + 1} / {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="text-sm text-indigo-600 disabled:opacity-40 hover:text-indigo-800 transition-colors">Próxima →</button>
            </div>
          )}
        </div>
      )}

      <TransactionSheet
        transaction={sheetTx}
        onClose={() => setSheetTx(null)}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      <Modal open={modal.open} onClose={closeModal} titleId="transaction-modal-title">
        <h3 id="transaction-modal-title" className="text-lg font-semibold text-gray-900 mb-4">
          {modal.editing ? 'Editar Transação' : 'Nova Transação'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="tx-title" className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input id="tx-title" type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <CategoryPicker
              userCategories={categories}
              displayName={form.category_display_name}
              onChange={handleCategorySelect}
              transactionType={form.type}
            />
          </div>
          <div>
            <label htmlFor="tx-type" className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select id="tx-type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'income' | 'expense' }))} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500">
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="tx-amount" className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
              <input id="tx-amount" type="number" required min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label htmlFor="tx-date" className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input id="tx-date" type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
          </div>
          <div>
            <label htmlFor="tx-notes" className="block text-sm font-medium text-gray-700 mb-1">Observação (opcional)</label>
            <textarea id="tx-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600 rounded-lg transition-colors">Cancelar</button>
            <button type="submit" disabled={submitting} className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-60">
              {submitting ? 'Salvando...' : (modal.editing ? 'Salvar alterações' : 'Criar Transação')}
            </button>
          </div>
        </form>
      </Modal>

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
