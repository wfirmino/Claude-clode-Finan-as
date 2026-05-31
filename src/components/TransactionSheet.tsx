import { useState, useEffect } from 'react'
import type { Transaction } from '../types'
import { formatCurrency, formatDate } from '../utils/formatters'

interface Props {
  transaction: Transaction | null
  onClose: () => void
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => void
}

function IconEdit() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function IconTag() {
  return (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  )
}

function IconType() {
  return (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  )
}

function IconNote() {
  return (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function IconRefresh() {
  return (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}

export default function TransactionSheet({ transaction, onClose, onEdit, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => { setConfirmDelete(false) }, [transaction?.id])

  if (!transaction) return null

  function handleClose() {
    setConfirmDelete(false)
    onClose()
  }

  const isIncome = transaction.type === 'income'

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalhes da transação"
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#111] rounded-t-2xl shadow-xl"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-base font-semibold text-white">Detalhes da Transação</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { onEdit(transaction); handleClose() }}
              className="flex items-center gap-1.5 text-gray-400 hover:text-gray-200 transition-colors"
              aria-label="Editar"
            >
              <IconEdit />
              <span className="text-sm">Editar</span>
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Confirmar?</span>
                <button
                  onClick={() => { onDelete(transaction.id); handleClose() }}
                  className="text-xs font-medium text-red-400"
                >
                  Sim
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-gray-500"
                >
                  Não
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-gray-400 hover:text-gray-200 transition-colors"
                aria-label="Excluir"
              >
                <IconTrash />
                <span className="text-sm">Excluir</span>
              </button>
            )}
          </div>
        </div>

        {/* Main block */}
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="w-14 h-14 rounded-xl bg-[#2a2a2a] flex items-center justify-center text-2xl flex-shrink-0">
            {isIncome ? '💰' : '💸'}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-400 mb-0.5 truncate">{transaction.title}</p>
            <p className={`text-2xl font-bold tabular-nums ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
              {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
            </p>
          </div>
        </div>

        {/* Detail rows */}
        <div className="divide-y mx-5 rounded-xl overflow-hidden" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex justify-between items-center py-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <IconCalendar />
              <span className="text-sm text-gray-400">Data</span>
            </div>
            <span className="text-sm text-white">{formatDate(transaction.date)}</span>
          </div>

          <div className="flex justify-between items-center py-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <IconTag />
              <span className="text-sm text-gray-400">Categoria</span>
            </div>
            <span className="text-sm text-white">{transaction.categories?.name ?? '—'}</span>
          </div>

          <div className="flex justify-between items-center py-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <IconType />
              <span className="text-sm text-gray-400">Tipo</span>
            </div>
            <span className="text-sm text-white">{isIncome ? 'Receita' : 'Despesa'}</span>
          </div>

          {transaction.notes && (
            <div className="flex justify-between items-start py-3 gap-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2 shrink-0">
                <IconNote />
                <span className="text-sm text-gray-400">Observação</span>
              </div>
              <span className="text-sm text-white text-right">{transaction.notes}</span>
            </div>
          )}
        </div>

        {/* Transações semelhantes */}
        <div className="px-5 pt-5">
          <div className="flex items-center gap-2 mb-3">
            <IconRefresh />
            <span className="text-sm font-medium text-gray-400">Transações semelhantes</span>
          </div>
          <p className="text-sm text-gray-600 text-center py-4">Nenhuma transação semelhante encontrada</p>
        </div>
      </div>
    </>
  )
}
