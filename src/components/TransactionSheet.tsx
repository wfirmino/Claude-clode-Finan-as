import { useState, useEffect } from 'react'
import type { Transaction } from '../types'
import { formatCurrency, formatDate } from '../utils/formatters'

interface Props {
  transaction: Transaction | null
  onClose: () => void
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => void
}

export default function TransactionSheet({ transaction, onClose, onEdit, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => { setConfirmDelete(false) }, [transaction?.id])

  if (!transaction) return null

  function handleClose() {
    setConfirmDelete(false)
    onClose()
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalhes da transação"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#1a1a1a] rounded-t-2xl shadow-xl"
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-[#2a2a2a]">
          <span className="text-sm font-bold text-gray-900 dark:text-white">Detalhes da Transação</span>
          <div className="flex gap-4">
            <button
              onClick={() => { onEdit(transaction); handleClose() }}
              className="text-sm font-semibold text-indigo-600"
            >
              ✏️ Editar
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">Confirmar exclusão?</span>
                <button
                  onClick={() => { onDelete(transaction.id); handleClose() }}
                  className="text-sm font-semibold text-red-600"
                >
                  Sim
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-sm font-medium text-gray-400"
                >
                  Não
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-sm font-semibold text-red-500"
              >
                🗑 Excluir
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 dark:border-[#2a2a2a]">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-2xl">
            {transaction.type === 'income' ? '💰' : '💸'}
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{transaction.title}</p>
            <p className={`text-2xl font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
              {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
            </p>
          </div>
        </div>
        <div
          className="divide-y divide-gray-50 dark:divide-[#2a2a2a]"
          style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex justify-between items-center px-5 py-3 text-sm">
            <span className="text-gray-400 dark:text-gray-500">📅 Data</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">{formatDate(transaction.date)}</span>
          </div>
          <div className="flex justify-between items-center px-5 py-3 text-sm">
            <span className="text-gray-400 dark:text-gray-500">🏷 Categoria</span>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${transaction.type === 'income' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'}`}>
              {transaction.categories?.name ?? '—'}
            </span>
          </div>
          <div className="flex justify-between items-center px-5 py-3 text-sm">
            <span className="text-gray-400 dark:text-gray-500">📝 Tipo</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {transaction.type === 'income' ? 'Receita' : 'Despesa'}
            </span>
          </div>
          {transaction.notes && (
            <div className="flex justify-between items-center px-5 py-3 text-sm">
              <span className="text-gray-400 dark:text-gray-500">📌 Observação</span>
              <span className="font-medium text-gray-800 dark:text-gray-200 max-w-[200px] text-right">{transaction.notes}</span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
