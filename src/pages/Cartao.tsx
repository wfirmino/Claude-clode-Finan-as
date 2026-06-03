import { useState, useMemo, useRef } from 'react'
import { useCards } from '../hooks/useCards'
import { useTransactions } from '../hooks/useTransactions'
import { useInstallments, type Installment, getNextDueDate } from '../hooks/useInstallments'
import type { Card, Transaction } from '../types'
import { formatCurrency, formatDate } from '../utils/formatters'
import { getErrorMessage } from '../utils/errors'
import CartaoSummary from '../components/CartaoSummary'
import ImportModal from '../components/ImportModal'
import Modal from '../components/Modal'
import Toast from '../components/Toast'

const CARD_COLORS = ['#8b5cf6', '#6366f1', '#ec4899', '#ef4444', '#f59e0b', '#10b981']

interface CardForm { name: string; due_day: string; color: string }
const defaultCardForm: CardForm = { name: '', due_day: '', color: '#8b5cf6' }

interface TxForm {
  title: string; amount: string; type: 'expense' | 'income'; date: string; notes: string
  isParcelamento: boolean; total_installments: string; first_payment_date: string
}
function defaultTxForm(): TxForm {
  const today = new Date().toISOString().split('T')[0]
  return { title: '', amount: '', type: 'expense', date: today, notes: '', isParcelamento: false, total_installments: '', first_payment_date: today }
}

interface InstForm { name: string; total_amount: string; total_installments: string; first_payment_date: string; notes: string }
function defaultInstForm(): InstForm {
  return { name: '', total_amount: '', total_installments: '', first_payment_date: new Date().toISOString().split('T')[0], notes: '' }
}

export default function Cartao() {
  const { cards, loading: cardsLoading, createCard, updateCard, deleteCard } = useCards()
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const activeCard = useMemo(
    () => cards.find(c => c.id === activeCardId) ?? cards[0] ?? null,
    [cards, activeCardId]
  )

  const { transactions, bulkCreateTransactions, createTransaction, updateTransaction, deleteTransaction } = useTransactions(
    { perfil: 'cartao' }
  )
  const cardTxs = useMemo(
    () => transactions.filter(t => t.card_id === activeCard?.id),
    [transactions, activeCard]
  )

  const { installments, createInstallment, updateInstallment, deleteInstallment, payNext } = useInstallments(activeCard?.id)

  const [activeTab, setActiveTab] = useState<'lancamentos' | 'parcelamentos'>('lancamentos')

  const [cardModal, setCardModal] = useState<{ open: boolean; editing: Card | null }>({ open: false, editing: null })
  const [cardForm, setCardForm] = useState<CardForm>(defaultCardForm)
  const [txModal, setTxModal] = useState<{ open: boolean; editing: Transaction | null }>({ open: false, editing: null })
  const [txForm, setTxForm] = useState<TxForm>(defaultTxForm())
  const [instModal, setInstModal] = useState<{ open: boolean; editing: Installment | null }>({ open: false, editing: null })
  const [instForm, setInstForm] = useState<InstForm>(defaultInstForm())
  const [confirmDeleteTx, setConfirmDeleteTx] = useState<string | null>(null)
  const [confirmDeleteInst, setConfirmDeleteInst] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' } | null>(null)
  const toastId = useRef(0)

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ id: ++toastId.current, message, type })
  }

  function openCreate() { setCardForm(defaultCardForm); setCardModal({ open: true, editing: null }) }
  function openEdit(c: Card) {
    setCardForm({ name: c.name, due_day: String(c.due_day), color: c.color })
    setCardModal({ open: true, editing: c })
  }

  function openCreateTx() { setTxForm(defaultTxForm()); setTxModal({ open: true, editing: null }) }
  function openEditTx(t: Transaction) {
    setTxForm({ title: t.title, amount: String(t.amount), type: t.type as 'expense' | 'income', date: t.date, notes: t.notes ?? '', isParcelamento: false, total_installments: '', first_payment_date: t.date })
    setTxModal({ open: true, editing: t })
  }
  function openEditInst(inst: Installment) {
    setInstForm({
      name: inst.name,
      total_amount: String(inst.total_amount),
      total_installments: String(inst.total_installments),
      first_payment_date: inst.first_payment_date,
      notes: inst.notes ?? '',
    })
    setInstModal({ open: true, editing: inst })
  }

  async function handleTxSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(txForm.amount.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) { showToast('Valor inválido.', 'error'); return }
    if (!txForm.title.trim()) { showToast('Informe a descrição.', 'error'); return }
    if (!activeCard) return
    if (submitting) return

    if (txForm.isParcelamento) {
      const parcelas = parseInt(txForm.total_installments)
      if (isNaN(parcelas) || parcelas < 1) { showToast('Número de parcelas inválido.', 'error'); return }
      setSubmitting(true)
      try {
        const installment_amount = Math.round((amount / parcelas) * 100) / 100
        await createInstallment({
          name: txForm.title.trim(),
          total_amount: amount,
          original_amount: amount,
          interest_amount: 0,
          installment_amount,
          total_installments: parcelas,
          paid_installments: 0,
          first_payment_date: txForm.first_payment_date,
          category: null,
          notes: txForm.notes.trim() || null,
          card_id: activeCard.id,
        })
        showToast('Parcelamento adicionado.', 'success')
        setTxModal({ open: false, editing: null })
      } catch (err) { showToast(getErrorMessage(err), 'error') }
      finally { setSubmitting(false) }
      return
    }

    setSubmitting(true)
    try {
      const values = {
        title: txForm.title.trim(),
        amount,
        type: txForm.type,
        date: txForm.date,
        notes: txForm.notes.trim() || null,
        perfil: 'cartao' as const,
        card_id: activeCard.id,
        category_id: null,
      }
      if (txModal.editing) {
        await updateTransaction(txModal.editing.id, values)
        showToast('Lançamento atualizado.', 'success')
      } else {
        await createTransaction(values)
        showToast('Lançamento adicionado.', 'success')
      }
      setTxModal({ open: false, editing: null })
    } catch (err) { showToast(getErrorMessage(err), 'error') }
    finally { setSubmitting(false) }
  }

  async function handleDeleteTx(id: string) {
    setConfirmDeleteTx(null)
    try { await deleteTransaction(id); showToast('Lançamento excluído.', 'success') }
    catch (err) { showToast(getErrorMessage(err), 'error') }
  }

  async function handleInstSubmit(e: React.FormEvent) {
    e.preventDefault()
    const total = parseFloat(instForm.total_amount.replace(',', '.'))
    const parcelas = parseInt(instForm.total_installments)
    if (isNaN(total) || total <= 0) { showToast('Valor total inválido.', 'error'); return }
    if (isNaN(parcelas) || parcelas < 1) { showToast('Número de parcelas inválido.', 'error'); return }
    if (!instForm.name.trim()) { showToast('Informe a descrição.', 'error'); return }
    if (!activeCard) return
    if (submitting) return
    setSubmitting(true)
    const installment_amount = Math.round((total / parcelas) * 100) / 100
    try {
      const values = {
        name: instForm.name.trim(),
        total_amount: total,
        original_amount: total,
        interest_amount: 0,
        installment_amount,
        total_installments: parcelas,
        paid_installments: instModal.editing?.paid_installments ?? 0,
        first_payment_date: instForm.first_payment_date,
        category: null,
        notes: instForm.notes.trim() || null,
        card_id: activeCard.id,
      }
      if (instModal.editing) {
        await updateInstallment(instModal.editing.id, values)
        showToast('Parcelamento atualizado.', 'success')
      } else {
        await createInstallment(values)
        showToast('Parcelamento adicionado.', 'success')
      }
      setInstModal({ open: false, editing: null })
    } catch (err) { showToast(getErrorMessage(err), 'error') }
    finally { setSubmitting(false) }
  }

  async function handleDeleteInst(id: string) {
    setConfirmDeleteInst(null)
    try { await deleteInstallment(id); showToast('Parcelamento excluído.', 'success') }
    catch (err) { showToast(getErrorMessage(err), 'error') }
  }

  async function handlePayNext(inst: Installment) {
    try { await payNext(inst.id, inst.paid_installments); showToast('Parcela marcada como paga.', 'success') }
    catch (err) { showToast(getErrorMessage(err), 'error') }
  }

  async function handleCardSubmit(e: React.FormEvent) {
    e.preventDefault()
    const due = parseInt(cardForm.due_day)
    if (isNaN(due) || due < 1 || due > 31) { showToast('Dia de vencimento inválido (1–31).', 'error'); return }
    if (!cardForm.name.trim()) { showToast('Informe o nome do cartão.', 'error'); return }
    if (submitting) return
    setSubmitting(true)
    try {
      const values = { name: cardForm.name.trim(), due_day: due, color: cardForm.color }
      if (cardModal.editing) {
        await updateCard(cardModal.editing.id, values)
        showToast('Cartão atualizado.', 'success')
      } else {
        await createCard(values)
        showToast('Cartão adicionado.', 'success')
      }
      setCardModal({ open: false, editing: null })
    } catch (err) { showToast(getErrorMessage(err), 'error') }
    finally { setSubmitting(false) }
  }

  async function handleDelete(id: string) {
    try { await deleteCard(id); showToast('Cartão excluído.', 'success') }
    catch (err) { showToast(getErrorMessage(err), 'error') }
  }

  async function handleImport(rows: Parameters<typeof bulkCreateTransactions>[0]) {
    await bulkCreateTransactions(rows)
    showToast(`${rows.length} transação(ões) importada(s).`, 'success')
  }

  const selectedMes = useMemo(() => {
    const d = new Date()
    return d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
  }, [])

  if (cardsLoading) return <p className="text-sm text-gray-400">Carregando...</p>

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Cartões</h2>
        <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          + Novo Cartão
        </button>
      </div>

      {/* Empty state */}
      {cards.length === 0 && (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">💳</p>
          <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">Nenhum cartão cadastrado.</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">Adicione um cartão para importar extratos e controlar faturas.</p>
          <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
            + Adicionar cartão
          </button>
        </div>
      )}

      {/* Card tabs + content */}
      {cards.length > 0 && (
        <>
          {/* Card selector tabs */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
            {cards.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCardId(c.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeCard?.id === c.id ? 'text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                style={activeCard?.id === c.id ? { backgroundColor: c.color } : {}}
              >
                <span className="w-2 h-2 rounded-full bg-current opacity-70" />
                {c.name}
              </button>
            ))}
            <button
              onClick={openCreate}
              className="flex-shrink-0 px-3 py-2 rounded-full text-sm text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600"
            >
              + Novo
            </button>
            <div className="ml-auto flex-shrink-0">
              <button
                onClick={() => setImportOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Importar
              </button>
            </div>
          </div>

          {/* Card actions */}
          {activeCard && (
            <div className="flex items-center justify-end mb-4">
              <button
                onClick={openCreateTx}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                + Lançamento
              </button>
            </div>
          )}

          {/* Summary */}
          {activeCard && (
            <CartaoSummary
              transactions={cardTxs}
              installments={installments}
              dueDay={activeCard.due_day}
              periodo={selectedMes}
              onEditCard={() => openEdit(activeCard)}
              onDeleteCard={() => handleDelete(activeCard.id)}
            />
          )}

          {/* Sub-tabs: Lançamentos / Parcelamentos */}
          {activeCard && (
            <div className="flex border-b border-gray-200 dark:border-white/10 mb-4">
              <button
                onClick={() => setActiveTab('lancamentos')}
                className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'lancamentos' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
              >
                Lançamentos {cardTxs.length > 0 && <span className="ml-1 text-xs opacity-60">({cardTxs.length})</span>}
              </button>
              <button
                onClick={() => setActiveTab('parcelamentos')}
                className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'parcelamentos' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
              >
                Parcelamentos {installments.length > 0 && <span className="ml-1 text-xs opacity-60">({installments.length})</span>}
              </button>
            </div>
          )}

          {/* Lançamentos list */}
          {activeTab === 'lancamentos' && (
            <div className="space-y-2">
              {cardTxs.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">
                  Nenhum lançamento. Use "+ Lançamento" ou importe um extrato.
                </p>
              )}
              {cardTxs.map(t => (
                <div key={t.id} className="border border-gray-200 dark:border-white/[0.08] rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg flex-shrink-0">{t.type === 'income' ? '✅' : '🛍️'}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{t.title}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(t.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                      <span className={`text-sm font-semibold tabular-nums ${t.type === 'income' ? 'text-green-600' : 'text-gray-800 dark:text-gray-200'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                      <button onClick={() => openEditTx(t)} className="text-xs text-indigo-500 hover:underline">Editar</button>
                      {confirmDeleteTx === t.id ? (
                        <span className="flex items-center gap-1 text-xs">
                          <button onClick={() => handleDeleteTx(t.id)} className="text-red-600 font-medium hover:underline">Sim</button>
                          <span className="text-gray-400">/</span>
                          <button onClick={() => setConfirmDeleteTx(null)} className="text-gray-500 hover:underline">Não</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmDeleteTx(t.id)} className="text-xs text-red-400 hover:underline">Excluir</button>
                      )}
                    </div>
                  </div>
                  {t.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 ml-9">{t.notes}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Parcelamentos list */}
          {activeTab === 'parcelamentos' && (
            <div className="space-y-2">
              {installments.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">
                  Nenhum parcelamento. Use "+ Parcelamento" para adicionar.
                </p>
              )}
              {installments.map(inst => {
                const restantes = inst.total_installments - inst.paid_installments
                const quitado = restantes <= 0
                const proxVenc = quitado ? null : getNextDueDate(inst)
                const totalRestante = Math.round(inst.installment_amount * restantes * 100) / 100
                return (
                  <div key={inst.id} className={`border rounded-xl px-4 py-3 ${quitado ? 'border-gray-100 dark:border-white/[0.05] opacity-60' : 'border-amber-200 dark:border-amber-900/40'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg flex-shrink-0">{quitado ? '✅' : '📦'}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{inst.name}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {inst.paid_installments}/{inst.total_installments} parcelas
                            {proxVenc && ` · próx. ${formatDate(proxVenc.toISOString().split('T')[0])}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums text-gray-800 dark:text-gray-200">{formatCurrency(inst.installment_amount)}/mês</p>
                          <p className="text-xs text-amber-600 dark:text-amber-400 tabular-nums">{formatCurrency(totalRestante)} restante</p>
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mb-2">
                      <div
                        className="h-1.5 rounded-full bg-amber-400 transition-all"
                        style={{ width: `${Math.round((inst.paid_installments / inst.total_installments) * 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      {!quitado && (
                        <button onClick={() => handlePayNext(inst)} className="text-green-600 dark:text-green-400 font-medium hover:underline">
                          Marcar parcela paga
                        </button>
                      )}
                      <button onClick={() => openEditInst(inst)} className="text-indigo-500 hover:underline">Editar</button>
                      {confirmDeleteInst === inst.id ? (
                        <span className="flex items-center gap-1">
                          <button onClick={() => handleDeleteInst(inst.id)} className="text-red-600 font-medium hover:underline">Sim</button>
                          <span className="text-gray-400">/</span>
                          <button onClick={() => setConfirmDeleteInst(null)} className="text-gray-500 hover:underline">Não</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmDeleteInst(inst.id)} className="text-red-400 hover:underline">Excluir</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Modal: novo/editar cartão */}
      <Modal open={cardModal.open} onClose={() => setCardModal({ open: false, editing: null })} titleId="card-modal-title">
        <h3 id="card-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {cardModal.editing ? 'Editar Cartão' : 'Novo Cartão'}
        </h3>
        <form onSubmit={handleCardSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do cartão</label>
            <input
              type="text" required placeholder="Ex: Nubank, Itaú Platinum"
              value={cardForm.name}
              onChange={e => setCardForm(f => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-[#1a1a1a] dark:text-white text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dia de vencimento</label>
            <input
              type="number" required min={1} max={31} placeholder="Ex: 10"
              value={cardForm.due_day}
              onChange={e => setCardForm(f => ({ ...f, due_day: e.target.value }))}
              className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-[#1a1a1a] dark:text-white text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cor</label>
            <div className="flex gap-2">
              {CARD_COLORS.map(color => (
                <button
                  key={color} type="button"
                  onClick={() => setCardForm(f => ({ ...f, color }))}
                  className={`w-8 h-8 rounded-full transition-transform ${cardForm.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setCardModal({ open: false, editing: null })} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">Cancelar</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60">
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: novo/editar lançamento */}
      <Modal open={txModal.open} onClose={() => setTxModal({ open: false, editing: null })} titleId="tx-modal-title">
        <h3 id="tx-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {txModal.editing ? 'Editar Lançamento' : 'Novo Lançamento'}
        </h3>
        <form onSubmit={handleTxSubmit} className="space-y-4">
          {/* Toggle parcelamento */}
          <button
            type="button"
            onClick={() => setTxForm(f => ({ ...f, isParcelamento: !f.isParcelamento }))}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${txForm.isParcelamento ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'}`}
          >
            <span>É um parcelamento?</span>
            <span className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${txForm.isParcelamento ? 'bg-amber-400' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <span className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${txForm.isParcelamento ? 'translate-x-4' : 'translate-x-0'}`} />
            </span>
          </button>

          {/* Campos específicos de parcelamento */}
          {txForm.isParcelamento ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                <input type="text" required placeholder="Ex: TV Samsung, iPhone 15…"
                  value={txForm.title} onChange={e => setTxForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-[#1a1a1a] dark:text-white text-sm focus:ring-amber-500 focus:border-amber-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor total (R$)</label>
                  <input type="text" required inputMode="decimal" placeholder="0,00"
                    value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-[#1a1a1a] dark:text-white text-sm focus:ring-amber-500 focus:border-amber-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nº de parcelas</label>
                  <input type="number" required min={1} max={120} placeholder="Ex: 12"
                    value={txForm.total_installments} onChange={e => setTxForm(f => ({ ...f, total_installments: e.target.value }))}
                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-[#1a1a1a] dark:text-white text-sm focus:ring-amber-500 focus:border-amber-500" />
                </div>
              </div>
              {(() => {
                const v = parseFloat(txForm.amount.replace(',', '.'))
                const n = parseInt(txForm.total_installments)
                if (!isNaN(v) && !isNaN(n) && n > 0 && v > 0)
                  return <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">= {formatCurrency(Math.round(v / n * 100) / 100)}/mês</p>
              })()}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data da 1ª parcela</label>
                <input type="date" required value={txForm.first_payment_date}
                  onChange={e => setTxForm(f => ({ ...f, first_payment_date: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-[#1a1a1a] dark:text-white text-sm focus:ring-amber-500 focus:border-amber-500" />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setTxForm(f => ({ ...f, type: 'expense' }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${txForm.type === 'expense' ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}>
                    Despesa
                  </button>
                  <button type="button" onClick={() => setTxForm(f => ({ ...f, type: 'income' }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${txForm.type === 'income' ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}>
                    Pagamento
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                <input type="text" required placeholder="Ex: Supermercado, Restaurante…"
                  value={txForm.title} onChange={e => setTxForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-[#1a1a1a] dark:text-white text-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor (R$)</label>
                <input type="text" required inputMode="decimal" placeholder="0,00"
                  value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-[#1a1a1a] dark:text-white text-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data</label>
                <input type="date" required value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-[#1a1a1a] dark:text-white text-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observação (opcional)</label>
            <input type="text" placeholder="Ex: compra no shopping"
              value={txForm.notes} onChange={e => setTxForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-[#1a1a1a] dark:text-white text-sm focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setTxModal({ open: false, editing: null })} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">Cancelar</button>
            <button type="submit" disabled={submitting} className={`px-4 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-60 ${txForm.isParcelamento ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: novo/editar parcelamento */}
      <Modal open={instModal.open} onClose={() => setInstModal({ open: false, editing: null })} titleId="inst-modal-title">
        <h3 id="inst-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {instModal.editing ? 'Editar Parcelamento' : 'Novo Parcelamento'}
        </h3>
        <form onSubmit={handleInstSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
            <input type="text" required placeholder="Ex: TV Samsung, iPhone 15…"
              value={instForm.name} onChange={e => setInstForm(f => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-[#1a1a1a] dark:text-white text-sm focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor total (R$)</label>
              <input type="text" required inputMode="decimal" placeholder="0,00"
                value={instForm.total_amount} onChange={e => setInstForm(f => ({ ...f, total_amount: e.target.value }))}
                className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-[#1a1a1a] dark:text-white text-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nº de parcelas</label>
              <input type="number" required min={1} max={120} placeholder="Ex: 12"
                value={instForm.total_installments} onChange={e => setInstForm(f => ({ ...f, total_installments: e.target.value }))}
                className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-[#1a1a1a] dark:text-white text-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
          </div>
          {instForm.total_amount && instForm.total_installments && (() => {
            const v = parseFloat(instForm.total_amount.replace(',', '.'))
            const n = parseInt(instForm.total_installments)
            if (!isNaN(v) && !isNaN(n) && n > 0 && v > 0) {
              return (
                <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                  = {formatCurrency(Math.round(v / n * 100) / 100)}/mês
                </p>
              )
            }
          })()}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data da 1ª parcela</label>
            <input type="date" required value={instForm.first_payment_date}
              onChange={e => setInstForm(f => ({ ...f, first_payment_date: e.target.value }))}
              className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-[#1a1a1a] dark:text-white text-sm focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observação (opcional)</label>
            <input type="text" placeholder="Ex: Compra no shopping"
              value={instForm.notes} onChange={e => setInstForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-[#1a1a1a] dark:text-white text-sm focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setInstModal({ open: false, editing: null })} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">Cancelar</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-60">
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Import modal */}
      {activeCard && (
        <ImportModal
          open={importOpen}
          cardName={activeCard.name}
          cardId={activeCard.id}
          onClose={() => setImportOpen(false)}
          onImport={async (rows) => {
            await handleImport(rows as any)
            setImportOpen(false)
          }}
        />
      )}

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
