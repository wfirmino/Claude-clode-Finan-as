import { useState, useRef, useMemo, useEffect } from 'react'
import { useTransactions, type TransactionFilters } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { useEmpresarialConfig } from '../hooks/useEmpresarialConfig'
import type { Transaction, DatePreset, Perfil } from '../types'
import { formatCurrency, formatDate, numToStr, parseBR } from '../utils/formatters'
import { getErrorMessage, isCheckConstraintError } from '../utils/errors'
import Toast from '../components/Toast'
import Modal from '../components/Modal'
import CategoryPicker from '../components/CategoryPicker'
import TransactionSheet from '../components/TransactionSheet'
import MobileFilterSheet, { type MobileFilters } from '../components/MobileFilterSheet'
import ProfileTabs from '../components/ProfileTabs'
import EmpresarialSummary from '../components/EmpresarialSummary'
import KommoSummary from '../components/KommoSummary'

// ─── Form types ───────────────────────────────────────────────────────────────

interface FormStatePessoal {
  perfil: 'pessoal'
  title: string
  amount: string
  category_id: string
  category_display_name: string
  type: 'income' | 'expense'
  date: string
  notes: string
}

interface FormStateEmpresarial {
  perfil: 'empresarial'
  nome_cliente: string
  nome_empresa: string
  amount: string          // faturamento (valor total)
  divisao_socio: string
  type: 'income' | 'expense'
  date: string
  category_id: string
  category_display_name: string
}

interface FormStateKommo {
  perfil: 'kommo'
  nome_cliente: string
  nome_empresa: string
  apenas_usuario_adicional: boolean
  lancamento_simplificado: boolean
  sem_comissao: boolean
  forma_pagamento: 'cartao' | 'pix'
  plano: string           // '3'|'6'|'9'|'12'|'24'
  num_usuarios: string
  valor_total_assinatura: string
  valor_liquido: string
  valor_pago_kommo: string
  divisao_socio_pct: string
  valor_liquido_recebido: string
  date: string
}

type FormState = FormStatePessoal | FormStateEmpresarial | FormStateKommo

// ─── Helpers ─────────────────────────────────────────────────────────────────

function defaultFormForPerfil(perfil: Perfil): FormState {
  const today = new Date().toISOString().split('T')[0]
  if (perfil === 'pessoal') {
    return { perfil: 'pessoal', title: '', amount: '', category_id: '', category_display_name: '', type: 'expense', date: today, notes: '' }
  }
  if (perfil === 'empresarial') {
    return { perfil: 'empresarial', nome_cliente: '', nome_empresa: '', amount: '', divisao_socio: '', type: 'income', date: today, category_id: '', category_display_name: '' }
  }
  return { perfil: 'kommo', nome_cliente: '', nome_empresa: '', apenas_usuario_adicional: false, lancamento_simplificado: false, sem_comissao: false, forma_pagamento: 'cartao', plano: '12', num_usuarios: '', valor_total_assinatura: '', valor_liquido: '', valor_pago_kommo: '', divisao_socio_pct: '', valor_liquido_recebido: '', date: today }
}

function calcKommo(vt: number, vl: number, vk: number, pct: number) {
  const c = (n: number) => Math.round(n * 100)
  const taxaC = c(vt) - c(vl)
  const liquidaC = c(vl) - c(vk)
  const socioC = Math.round(liquidaC * pct / 100)
  const finalC = liquidaC - socioC
  return {
    taxa: taxaC / 100,
    valorKommo: c(vk) / 100,
    liquida: liquidaC / 100,
    socio: socioC / 100,
    final: finalC / 100,
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

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

const PLANOS = ['3', '6', '9', '12', '24']


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

// ─── Main component ───────────────────────────────────────────────────────────

export default function Transactions() {
  // Profile
  const [activePerfil, setActivePerfil] = useState<Perfil>('pessoal')
  const currentMes = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })()

  // Filters
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

  // Reset page when profile changes
  useEffect(() => { setPage(0) }, [activePerfil])

  const filters = useMemo<TransactionFilters>(() => {
    const range = datePreset === 'custom'
      ? { startDate: customStartDate || undefined, endDate: customEndDate || undefined }
      : getDateRange(datePreset)
    return {
      ...range,
      type: (typeFilter === 'income' || typeFilter === 'expense') ? typeFilter : undefined,
      categoryId: categoryFilter || undefined,
      perfil: activePerfil,
    }
  }, [datePreset, customStartDate, customEndDate, typeFilter, categoryFilter, activePerfil])

  const { transactions, loading, error, createTransaction, updateTransaction, deleteTransaction } = useTransactions(filters)
  const { categories, createCategory } = useCategories()
  const { prolabore, saveProlabore } = useEmpresarialConfig()

  // Modal state
  const [modal, setModal] = useState<{ open: boolean; editing: Transaction | null }>({ open: false, editing: null })
  const [form, setForm] = useState<FormState>(defaultFormForPerfil('pessoal'))
  const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sheetTx, setSheetTx] = useState<Transaction | null>(null)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const toastId = useRef(0)

  const { totalIncome, totalExpense, balance } = useMemo(() => {
    let income = 0, expense = 0
    for (const t of transactions) {
      if (t.type === 'income') income += t.amount
      else expense += t.amount
    }
    return { totalIncome: income, totalExpense: expense, balance: income - expense }
  }, [transactions])

  const kommoTotals = useMemo(() => {
    if (activePerfil !== 'kommo') return null
    const c = (n: number) => Math.round(n * 100)
    let assinaturasC = 0, liquidoC = 0, finalC = 0
    for (const t of transactions) {
      const vtC = c(t.valor_total_assinatura ?? 0)
      assinaturasC += vtC
      if (t.sem_comissao) continue
      if (t.lancamento_simplificado) {
        const vlC = t.valor_liquido != null ? c(t.valor_liquido) : vtC
        const vlrC = t.valor_liquido_recebido != null ? c(t.valor_liquido_recebido) : vlC
        liquidoC += vlC
        finalC += vlrC
      } else {
        const vlC = c(t.valor_liquido ?? 0)
        const vkC = c(t.valor_pago_kommo ?? 0)
        const pct = t.divisao_socio_pct ?? 0
        const liquidaC = vlC - vkC
        const socioC = Math.round(liquidaC * pct / 100)
        liquidoC += vlC
        finalC += liquidaC - socioC
      }
    }
    return { totalAssinaturas: assinaturasC / 100, totalLiquido: liquidoC / 100, valorFinal: finalC / 100, count: transactions.length }
  }, [transactions, activePerfil])

  const empresarialTotals = useMemo(() => {
    if (activePerfil !== 'empresarial') return null
    const c = (n: number) => Math.round(n * 100)
    let faturamentoC = 0, socioC = 0, despesaMEIC = 0
    for (const t of transactions) {
      if (t.type === 'income') {
        faturamentoC += c(t.amount)
        socioC += c(t.divisao_socio ?? 0)
      } else {
        despesaMEIC += c(t.amount)
      }
    }
    const suaParteC = faturamentoC - socioC
    const liquidoPessoalC = suaParteC - despesaMEIC - c(prolabore)
    return {
      faturamento: faturamentoC / 100,
      suaParte: suaParteC / 100,
      liquidoPessoal: liquidoPessoalC / 100,
    }
  }, [transactions, activePerfil, prolabore])

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

  function handleMobileFiltersApply(f: MobileFilters) {
    setDatePreset(f.datePreset)
    setCustomStartDate(f.customStartDate)
    setCustomEndDate(f.customEndDate)
    setTypeFilter(f.typeFilter)
    setCategoryFilter(f.categoryFilter)
    setPage(0)
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ id: ++toastId.current, message, type })
  }

  function openCreate() {
    setForm(defaultFormForPerfil(activePerfil))
    setModal({ open: true, editing: null })
  }

  function openEdit(t: Transaction) {
    const perfil: Perfil = t.perfil ?? 'pessoal'
    if (perfil === 'empresarial') {
      setForm({
        perfil: 'empresarial',
        nome_cliente: t.nome_cliente ?? t.title,
        nome_empresa: t.nome_empresa ?? '',
        amount: numToStr(t.amount),
        divisao_socio: numToStr(t.divisao_socio),
        type: t.type,
        date: t.date,
        category_id: t.category_id ?? '',
        category_display_name: t.categories?.name ?? '',
      })
    } else if (perfil === 'kommo') {
      setForm({
        perfil: 'kommo',
        nome_cliente: t.nome_cliente ?? t.title,
        nome_empresa: t.nome_empresa ?? '',
        apenas_usuario_adicional: t.apenas_usuario_adicional ?? false,
        lancamento_simplificado: t.lancamento_simplificado ?? false,
        sem_comissao: t.sem_comissao ?? false,
        forma_pagamento: (t.forma_pagamento === 'pix' ? 'pix' : 'cartao') as 'cartao' | 'pix',
        plano: String(t.plano ?? 12),
        num_usuarios: String(t.num_usuarios ?? ''),
        valor_total_assinatura: numToStr(t.valor_total_assinatura ?? t.amount),
        valor_liquido: numToStr(t.valor_liquido),
        valor_pago_kommo: numToStr(t.valor_pago_kommo),
        divisao_socio_pct: t.divisao_socio_pct != null ? String(t.divisao_socio_pct).replace('.', ',') : '',
        valor_liquido_recebido: numToStr(t.valor_liquido_recebido),
        date: t.date,
      })
    } else {
      setForm({
        perfil: 'pessoal',
        title: t.title,
        amount: numToStr(t.amount),
        category_id: t.category_id ?? '',
        category_display_name: t.categories?.name ?? '',
        type: t.type,
        date: t.date,
        notes: t.notes ?? '',
      })
    }
    setModal({ open: true, editing: t })
  }

  function closeModal() { setModal({ open: false, editing: null }) }

  function handleCategorySelect(name: string, catId: string, suggestedType?: 'income' | 'expense') {
    setForm(f => {
      if (f.perfil === 'pessoal') {
        return { ...f, category_id: catId, category_display_name: name, type: suggestedType ?? f.type }
      }
      if (f.perfil === 'empresarial') {
        return { ...f, category_id: catId, category_display_name: name }
      }
      return f
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      if (form.perfil === 'pessoal') {
        const amount = parseBR(form.amount)
        if (isNaN(amount) || amount <= 0) { showToast('Informe um valor numérico maior que zero.', 'error'); return }
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
          perfil: 'pessoal' as const,
        }
        if (modal.editing) {
          await updateTransaction(modal.editing.id, values)
          showToast('Transação atualizada.', 'success')
        } else {
          await createTransaction(values)
          showToast('Transação criada.', 'success')
        }
      } else if (form.perfil === 'empresarial') {
        const amount = parseBR(form.amount)
        if (isNaN(amount) || amount <= 0) { showToast('Informe um valor numérico maior que zero.', 'error'); return }
        if (!form.nome_cliente.trim()) { showToast('Nome do cliente é obrigatório.', 'error'); return }
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
          title: form.nome_cliente,
          amount,
          category_id: resolvedCategoryId,
          type: form.type,
          date: form.date,
          perfil: 'empresarial' as const,
          nome_cliente: form.nome_cliente,
          nome_empresa: form.nome_empresa || null,
          divisao_socio: (() => { const v = parseBR(form.divisao_socio); return isNaN(v) ? null : v })(),
          notes: null,
        }
        if (modal.editing) {
          await updateTransaction(modal.editing.id, values)
          showToast('Transação atualizada.', 'success')
        } else {
          await createTransaction(values)
          showToast('Transação criada.', 'success')
        }
      } else {
        // Kommo
        if (!form.nome_cliente.trim()) { showToast('Nome do cliente é obrigatório.', 'error'); return }
        let vt = parseBR(form.valor_total_assinatura)
        let vl: number | null = null
        let vk: number | null = null
        let rawDivisaoSocioPct: number | null = null
        let rawValorLiquidoRecebido: number | null = null
        if (form.lancamento_simplificado) {
          if (isNaN(vt)) vt = 0
          else if (vt < 0) { showToast('Valor total não pode ser negativo.', 'error'); return }
          const vlRaw = parseBR(form.valor_liquido)
          vl = (!isNaN(vlRaw) && vlRaw >= 0) ? vlRaw : null
          const vkRaw = parseBR(form.valor_pago_kommo)
          vk = (!isNaN(vkRaw) && vkRaw >= 0) ? vkRaw : null
          const raw = parseBR(form.divisao_socio_pct)
          rawDivisaoSocioPct = form.sem_comissao ? null : (isNaN(raw) ? null : raw)
          const vlrRaw = parseBR(form.valor_liquido_recebido)
          rawValorLiquidoRecebido = !form.sem_comissao && (!isNaN(vlrRaw) && vlrRaw >= 0) ? vlrRaw : null
        } else {
          if (isNaN(vt) || vt <= 0) { showToast('Informe um valor total de assinatura válido.', 'error'); return }
          if (form.forma_pagamento === 'pix') {
            vl = vt
          } else {
            const vlRaw = parseBR(form.valor_liquido)
            vl = (!isNaN(vlRaw) && vlRaw >= 0) ? vlRaw : vt
            if (vl <= 0) { showToast('Informe um valor líquido válido maior que zero.', 'error'); return }
            if (vl > vt) { showToast('Valor líquido não pode ser maior que o valor total da assinatura.', 'error'); return }
          }
          vk = parseBR(form.valor_pago_kommo)
          if (isNaN(vk) || vk < 0) { showToast('Informe o valor pago ao Kommo.', 'error'); return }
          if (!form.sem_comissao && vk >= vl) { showToast('Valor pago ao Kommo deve ser menor que o valor líquido.', 'error'); return }
          const raw = parseBR(form.divisao_socio_pct)
          rawDivisaoSocioPct = form.sem_comissao ? null : (isNaN(raw) ? null : raw)
        }
        const rawPlano = parseInt(form.plano)
        const rawNumUsuarios = parseInt(form.num_usuarios)
        const values = {
          title: form.nome_cliente,
          amount: vt,
          type: 'income' as const,
          date: form.date,
          perfil: 'kommo' as const,
          nome_cliente: form.nome_cliente,
          nome_empresa: form.nome_empresa || null,
          lancamento_simplificado: form.lancamento_simplificado,
          sem_comissao: form.sem_comissao,
          forma_pagamento: form.forma_pagamento,
          apenas_usuario_adicional: form.apenas_usuario_adicional,
          plano: (form.lancamento_simplificado || form.apenas_usuario_adicional) ? null : (isNaN(rawPlano) ? null : rawPlano),
          num_usuarios: form.lancamento_simplificado ? null : (isNaN(rawNumUsuarios) ? null : rawNumUsuarios),
          valor_total_assinatura: vt,
          valor_liquido: vl,
          valor_pago_kommo: form.sem_comissao ? null : vk,
          divisao_socio_pct: rawDivisaoSocioPct,
          valor_liquido_recebido: rawValorLiquidoRecebido,
          category_id: null,
          notes: null,
        }
        if (modal.editing) {
          await updateTransaction(modal.editing.id, values)
          showToast('Transação atualizada.', 'success')
        } else {
          await createTransaction(values)
          showToast('Transação criada.', 'success')
        }
      }
      closeModal()
    } catch (err) {
      if (isCheckConstraintError(err, 'transactions_amount_check')) {
        showToast('Informe o Valor total da assinatura antes de criar a transação.', 'error')
      } else {
        showToast(getErrorMessage(err), 'error')
      }
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

  // ─── Kommo live calc ───
  const kommoCalc = useMemo(() => {
    if (form.perfil !== 'kommo') return null
    if (form.lancamento_simplificado) return null
    const vt = parseBR(form.valor_total_assinatura)
    if (isNaN(vt) || vt <= 0) return null
    let vl: number
    if (form.forma_pagamento === 'pix') {
      vl = vt
    } else {
      const vlRaw = parseBR(form.valor_liquido)
      vl = (!isNaN(vlRaw) && vlRaw >= 0) ? vlRaw : vt
    }
    if (vl > vt) return null
    const vkRaw = parseBR(form.valor_pago_kommo)
    const vk = (!isNaN(vkRaw) && vkRaw >= 0) ? vkRaw : 0
    const taxa = Math.round(vt * 100 - vl * 100) / 100
    if (form.sem_comissao) {
      return { taxa, valorKommo: vk, liquida: 0, socio: 0, final: 0 }
    }
    const pct = parseBR(form.divisao_socio_pct) || 0
    return calcKommo(vt, vl, vk, pct)
  }, [form])

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="bg-white min-h-full">
      {/* Profile tabs */}
      <ProfileTabs active={activePerfil} onChange={p => { setActivePerfil(p); setPage(0) }} />

      {/* Monthly summaries */}
      {activePerfil === 'empresarial' && (
        <EmpresarialSummary
          transactions={transactions}
          mes={currentMes}
          periodo={DATE_PRESETS.find(p => p.key === datePreset)?.label ?? (datePreset === 'custom' ? 'Período personalizado' : 'Todo período')}
          prolabore={prolabore}
          onSaveProlabore={saveProlabore}
        />
      )}
      {activePerfil === 'kommo' && (
        <KommoSummary
          transactions={transactions}
          periodo={DATE_PRESETS.find(p => p.key === datePreset)?.label ?? (datePreset === 'custom' ? 'Período personalizado' : 'Todo período')}
        />
      )}

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
        onClick={() => setFilterSheetOpen(true)}
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

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          Erro ao carregar transações: {error}
        </div>
      )}

      {/* Summary cards */}
      {activePerfil === 'empresarial' && empresarialTotals ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-indigo-50 rounded-xl border border-indigo-100 px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Faturamento Total</span>
            </div>
            <p className="text-2xl font-bold text-indigo-600 tabular-nums">{formatCurrency(empresarialTotals.faturamento)}</p>
            <p className="text-xs text-indigo-400 mt-1">receitas no período</p>
          </div>

          <div className="bg-purple-50 rounded-xl border border-purple-100 px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-purple-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Sua Parte</span>
            </div>
            <p className="text-2xl font-bold text-purple-600 tabular-nums">{formatCurrency(empresarialTotals.suaParte)}</p>
            <p className="text-xs text-purple-400 mt-1">após divisão com sócio</p>
          </div>

          <div className={`rounded-xl border px-5 py-4 col-span-2 md:col-span-1 ${empresarialTotals.liquidoPessoal >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
            <div className="flex items-center gap-2 mb-2">
              <svg className={`w-4 h-4 shrink-0 ${empresarialTotals.liquidoPessoal >= 0 ? 'text-green-500' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className={`text-xs font-semibold uppercase tracking-wide ${empresarialTotals.liquidoPessoal >= 0 ? 'text-green-600' : 'text-red-400'}`}>Líquido Pessoal</span>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${empresarialTotals.liquidoPessoal >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(Math.abs(empresarialTotals.liquidoPessoal))}</p>
            <p className={`text-xs mt-1 ${empresarialTotals.liquidoPessoal >= 0 ? 'text-green-500' : 'text-red-400'}`}>após MEI e pró-labore</p>
          </div>
        </div>
      ) : kommoTotals ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-indigo-50 rounded-xl border border-indigo-100 px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Valor Total Bruto</span>
            </div>
            <p className="text-2xl font-bold text-indigo-600 tabular-nums">{formatCurrency(kommoTotals.totalAssinaturas)}</p>
            <p className="text-xs text-indigo-400 mt-1">{kommoTotals.count} assinaturas</p>
          </div>

          <div className="bg-purple-50 rounded-xl border border-purple-100 px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-purple-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Líquido pós-taxas</span>
            </div>
            <p className="text-2xl font-bold text-purple-600 tabular-nums">{formatCurrency(kommoTotals.totalLiquido)}</p>
            <p className="text-xs text-purple-400 mt-1">após taxas da maquininha</p>
          </div>

          <div className="bg-green-50 rounded-xl border border-green-100 px-5 py-4 col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Comissão</span>
            </div>
            <p className="text-2xl font-bold text-green-600 tabular-nums">{formatCurrency(kommoTotals.valorFinal)}</p>
            <p className="text-xs text-green-500 mt-1">após todos os descontos</p>
          </div>
        </div>
      ) : (
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
      )}

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

        {/* Type filter — only shown for pessoal */}
        {activePerfil === 'pessoal' && (
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value as '' | 'income' | 'expense'); setPage(0) }}
            className="rounded-lg border-gray-300 text-sm pl-3 pr-8 py-2"
          >
            <option value="">Todos os tipos</option>
            <option value="income">Receita</option>
            <option value="expense">Despesa</option>
          </select>
        )}

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
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <span>{t.title}</span>
                    {t.apenas_usuario_adicional && (
                      <span className="ml-2 text-xs font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">Usr. adicional</span>
                    )}
                    {t.sem_comissao && (
                      <span className="ml-2 text-xs font-medium text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full">Sem comissão</span>
                    )}
                  </td>
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

      <MobileFilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        current={{ datePreset, customStartDate, customEndDate, typeFilter, categoryFilter }}
        onApply={handleMobileFiltersApply}
        categories={categories}
      />

      <TransactionSheet
        transaction={sheetTx}
        onClose={() => setSheetTx(null)}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      {/* ─── Modal ─────────────────────────────────────────────────────────── */}
      <Modal open={modal.open} onClose={closeModal} titleId="transaction-modal-title">
        <h3 id="transaction-modal-title" className="text-lg font-semibold text-gray-900 mb-3">
          {modal.editing ? 'Editar Transação' : 'Nova Transação'}
        </h3>

        {/* Perfil selector — only when creating */}
        {!modal.editing && (
          <div className="flex gap-2 mb-3">
            {(['pessoal', 'empresarial', 'kommo'] as Perfil[]).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setForm(defaultFormForPerfil(p))}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors capitalize ${form.perfil === p ? 'bg-indigo-600 text-white border-indigo-600' : 'text-gray-600 border-gray-300 hover:bg-gray-50'}`}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* ── Pessoal form ── */}
          {form.perfil === 'pessoal' && (
            <>
              <div>
                <label htmlFor="tx-title" className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input id="tx-title" type="text" required value={form.title} onChange={e => setForm(f => f.perfil === 'pessoal' ? { ...f, title: e.target.value } : f)} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
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
                <select id="tx-type" value={form.type} onChange={e => setForm(f => f.perfil === 'pessoal' ? { ...f, type: e.target.value as 'income' | 'expense' } : f)} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="tx-amount" className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                  <input id="tx-amount" type="text" inputMode="decimal" required placeholder="0,00" value={form.amount} onChange={e => setForm(f => f.perfil === 'pessoal' ? { ...f, amount: e.target.value } : f)} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label htmlFor="tx-date" className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input id="tx-date" type="date" required value={form.date} onChange={e => setForm(f => f.perfil === 'pessoal' ? { ...f, date: e.target.value } : f)} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label htmlFor="tx-notes" className="block text-sm font-medium text-gray-700 mb-1">Observação (opcional)</label>
                <textarea id="tx-notes" value={form.notes} onChange={e => setForm(f => f.perfil === 'pessoal' ? { ...f, notes: e.target.value } : f)} rows={2} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
            </>
          )}

          {/* ── Empresarial form ── */}
          {form.perfil === 'empresarial' && (
            <>
              <div>
                <label htmlFor="emp-nome-cliente" className="block text-sm font-medium text-gray-700 mb-1">Nome do cliente</label>
                <input id="emp-nome-cliente" type="text" required value={form.nome_cliente} onChange={e => setForm(f => f.perfil === 'empresarial' ? { ...f, nome_cliente: e.target.value } : f)} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label htmlFor="emp-nome-empresa" className="block text-sm font-medium text-gray-700 mb-1">Nome da empresa</label>
                <input id="emp-nome-empresa" type="text" value={form.nome_empresa} onChange={e => setForm(f => f.perfil === 'empresarial' ? { ...f, nome_empresa: e.target.value } : f)} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="emp-amount" className="block text-sm font-medium text-gray-700 mb-1">Valor total (R$)</label>
                  <input id="emp-amount" type="text" inputMode="decimal" required placeholder="0,00" value={form.amount} onChange={e => setForm(f => f.perfil === 'empresarial' ? { ...f, amount: e.target.value } : f)} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label htmlFor="emp-divisao" className="block text-sm font-medium text-gray-700 mb-1">Divisão com sócio (R$)</label>
                  <input id="emp-divisao" type="text" inputMode="decimal" placeholder="0,00" value={form.divisao_socio} onChange={e => setForm(f => f.perfil === 'empresarial' ? { ...f, divisao_socio: e.target.value } : f)} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="emp-type" className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select id="emp-type" value={form.type} onChange={e => setForm(f => f.perfil === 'empresarial' ? { ...f, type: e.target.value as 'income' | 'expense' } : f)} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="income">Receita</option>
                    <option value="expense">Despesa</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="emp-date" className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input id="emp-date" type="date" required value={form.date} onChange={e => setForm(f => f.perfil === 'empresarial' ? { ...f, date: e.target.value } : f)} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>
            </>
          )}

          {/* ── Kommo form ── */}
          {form.perfil === 'kommo' && (
            <>
              <div>
                <label htmlFor="kommo-nome-cliente" className="block text-sm font-medium text-gray-700 mb-1">Nome do cliente</label>
                <input id="kommo-nome-cliente" type="text" required value={form.nome_cliente} onChange={e => setForm(f => f.perfil === 'kommo' ? { ...f, nome_cliente: e.target.value } : f)} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label htmlFor="kommo-nome-empresa" className="block text-sm font-medium text-gray-700 mb-1">Nome da empresa</label>
                <input id="kommo-nome-empresa" type="text" value={form.nome_empresa} onChange={e => setForm(f => f.perfil === 'kommo' ? { ...f, nome_empresa: e.target.value } : f)} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>

              {/* Toggle: lançamento simplificado */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={form.lancamento_simplificado}
                    onChange={e => setForm(f => f.perfil === 'kommo' ? { ...f, lancamento_simplificado: e.target.checked } : f)}
                  />
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-amber-500 transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                </div>
                <span className="text-sm font-medium text-gray-700">Lançamento simplificado</span>
                {form.lancamento_simplificado && (
                  <span className="text-xs text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-full">Sem cálculo</span>
                )}
              </label>

              {/* Toggle: sem comissão */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={form.sem_comissao}
                    onChange={e => setForm(f => f.perfil === 'kommo' ? { ...f, sem_comissao: e.target.checked } : f)}
                  />
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-rose-500 transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                </div>
                <span className="text-sm font-medium text-gray-700">Sem comissão</span>
                {form.sem_comissao && (
                  <span className="text-xs text-rose-700 font-medium bg-rose-50 px-2 py-0.5 rounded-full">Repasse direto</span>
                )}
              </label>

              {/* Toggle: apenas usuário adicional — oculto no modo simplificado */}
              {!form.lancamento_simplificado && (
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={form.apenas_usuario_adicional}
                      onChange={e => setForm(f => f.perfil === 'kommo' ? { ...f, apenas_usuario_adicional: e.target.checked } : f)}
                    />
                    <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 transition-colors" />
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Apenas usuário adicional</span>
                  {form.apenas_usuario_adicional && (
                    <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">Sem plano novo</span>
                  )}
                </label>
              )}

              {/* Plano + Nº usuários — oculto no modo simplificado */}
              {!form.lancamento_simplificado && (
                <div className="grid grid-cols-2 gap-4">
                  {!form.apenas_usuario_adicional && (
                    <div>
                      <label htmlFor="kommo-plano" className="block text-sm font-medium text-gray-700 mb-1">Plano</label>
                      <select id="kommo-plano" value={form.plano} onChange={e => setForm(f => f.perfil === 'kommo' ? { ...f, plano: e.target.value } : f)} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                        {PLANOS.map(p => <option key={p} value={p}>{p} meses</option>)}
                      </select>
                    </div>
                  )}
                  <div className={form.apenas_usuario_adicional ? 'col-span-2' : ''}>
                    <label htmlFor="kommo-usuarios" className="block text-sm font-medium text-gray-700 mb-1">Nº de usuários</label>
                    <input id="kommo-usuarios" type="number" min="1" step="1" value={form.num_usuarios} onChange={e => setForm(f => f.perfil === 'kommo' ? { ...f, num_usuarios: e.target.value } : f)} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                </div>
              )}

              {/* Forma de pagamento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Forma de pagamento</label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  {(['cartao', 'pix'] as const).map(fp => (
                    <button
                      key={fp}
                      type="button"
                      onClick={() => setForm(f => f.perfil === 'kommo' ? { ...f, forma_pagamento: fp } : f)}
                      className={`flex-1 py-1.5 text-sm font-medium transition-colors ${form.forma_pagamento === fp ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      {fp === 'cartao' ? 'Cartão' : 'Pix'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Valor total assinatura + Líquido pós-taxas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="kommo-vt" className="block text-sm font-medium text-gray-700 mb-1">Valor total assinatura (R$)</label>
                  <input id="kommo-vt" type="text" inputMode="decimal" required={!form.lancamento_simplificado} placeholder="0,00" value={form.valor_total_assinatura} onChange={e => setForm(f => f.perfil === 'kommo' ? { ...f, valor_total_assinatura: e.target.value } : f)} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label htmlFor="kommo-vl" className="block text-sm font-medium text-gray-700 mb-1">Líquido pós-taxas (R$)</label>
                  <input
                    id="kommo-vl"
                    type="text"
                    inputMode="decimal"
                    placeholder="Deixe vazio se não houver taxa (ex: Pix)"
                    value={form.forma_pagamento === 'pix' ? form.valor_total_assinatura : form.valor_liquido}
                    disabled={form.forma_pagamento === 'pix'}
                    onChange={e => setForm(f => f.perfil === 'kommo' ? { ...f, valor_liquido: e.target.value } : f)}
                    className={`w-full rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 ${form.forma_pagamento === 'pix' ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="kommo-vk" className="block text-sm font-medium text-gray-700 mb-1">Valor pago ao Kommo (R$)</label>
                <input id="kommo-vk" type="text" inputMode="decimal" required={!form.lancamento_simplificado} placeholder="0,00" value={form.valor_pago_kommo} onChange={e => setForm(f => f.perfil === 'kommo' ? { ...f, valor_pago_kommo: e.target.value } : f)} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div className={`grid gap-4 ${form.sem_comissao ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {!form.sem_comissao && (
                  <div>
                    <label htmlFor="kommo-socio-pct" className="block text-sm font-medium text-gray-700 mb-1">Divisão com sócio (%)</label>
                    <input id="kommo-socio-pct" type="text" inputMode="decimal" placeholder="0 se não houver sócio" value={form.divisao_socio_pct} onChange={e => setForm(f => f.perfil === 'kommo' ? { ...f, divisao_socio_pct: e.target.value } : f)} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                )}
                <div>
                  <label htmlFor="kommo-date" className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input id="kommo-date" type="date" required value={form.date} onChange={e => setForm(f => f.perfil === 'kommo' ? { ...f, date: e.target.value } : f)} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>
              {form.lancamento_simplificado && !form.sem_comissao && (
                <div>
                  <label htmlFor="kommo-vlr" className="block text-sm font-medium text-gray-700 mb-1">Valor líquido recebido (R$)</label>
                  <input id="kommo-vlr" type="text" inputMode="decimal" placeholder="0,00" value={form.valor_liquido_recebido} onChange={e => setForm(f => f.perfil === 'kommo' ? { ...f, valor_liquido_recebido: e.target.value } : f)} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              )}
              {/* Live calculation panel */}
              {kommoCalc && (
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-purple-700 mb-2">Cálculo automático</p>
                  {[
                    ['Taxa maquininha', kommoCalc.taxa],
                    ['Valor pago ao Kommo', kommoCalc.valorKommo],
                    ...(!form.sem_comissao ? [
                      ['Comissão líquida', kommoCalc.liquida] as [string, number],
                      ['Parte do sócio', kommoCalc.socio] as [string, number],
                      ['Valor final (seu)', kommoCalc.final] as [string, number],
                    ] : []),
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between text-xs">
                      <span className="text-gray-600">{label as string}</span>
                      <span className="font-medium tabular-nums text-purple-700">{formatCurrency(value as number)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

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
