import { useState, useMemo, useRef } from 'react'
import { useCards } from '../hooks/useCards'
import { useTransactions } from '../hooks/useTransactions'
import type { Card } from '../types'
import { formatCurrency, formatDate } from '../utils/formatters'
import { getErrorMessage } from '../utils/errors'
import CartaoSummary from '../components/CartaoSummary'
import ImportModal from '../components/ImportModal'
import Modal from '../components/Modal'
import Toast from '../components/Toast'

const CARD_COLORS = ['#8b5cf6', '#6366f1', '#ec4899', '#ef4444', '#f59e0b', '#10b981']

interface CardForm { name: string; due_day: string; color: string }
const defaultCardForm: CardForm = { name: '', due_day: '', color: '#8b5cf6' }

export default function Cartao() {
  const { cards, loading: cardsLoading, createCard, updateCard, deleteCard } = useCards()
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const activeCard = useMemo(
    () => cards.find(c => c.id === activeCardId) ?? cards[0] ?? null,
    [cards, activeCardId]
  )

  const { transactions, bulkCreateTransactions } = useTransactions(
    { perfil: 'cartao' }
  )
  const cardTxs = useMemo(
    () => transactions.filter(t => t.card_id === activeCard?.id),
    [transactions, activeCard]
  )

  const [cardModal, setCardModal] = useState<{ open: boolean; editing: Card | null }>({ open: false, editing: null })
  const [cardForm, setCardForm] = useState<CardForm>(defaultCardForm)
  const [importOpen, setImportOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
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
    setConfirmDelete(null)
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
          {/* Tab bar */}
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
            <div className="flex items-center justify-end gap-3 mb-4 text-sm">
              <button onClick={() => openEdit(activeCard)} className="text-indigo-600 hover:underline">Editar</button>
              {confirmDelete === activeCard.id ? (
                <>
                  <span className="text-gray-500 dark:text-gray-400">Excluir cartão e todas as transações?</span>
                  <button onClick={() => handleDelete(activeCard.id)} className="text-red-600 font-medium hover:underline">Sim</button>
                  <button onClick={() => setConfirmDelete(null)} className="text-gray-500 hover:underline">Não</button>
                </>
              ) : (
                <button onClick={() => setConfirmDelete(activeCard.id)} className="text-red-500 hover:underline">Excluir</button>
              )}
            </div>
          )}

          {/* Summary */}
          {activeCard && (
            <CartaoSummary transactions={cardTxs} dueDay={activeCard.due_day} periodo={selectedMes} />
          )}

          {/* Transaction list */}
          <div className="space-y-2">
            {cardTxs.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">
                Nenhuma transação. Importe um extrato para começar.
              </p>
            )}
            {cardTxs.map(t => (
              <div key={t.id} className="flex items-center justify-between bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#2a2a2a] rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{t.type === 'income' ? '✅' : '🛍️'}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{t.title}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(t.date)}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold tabular-nums ${t.type === 'income' ? 'text-green-600' : 'text-gray-800 dark:text-gray-200'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
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
