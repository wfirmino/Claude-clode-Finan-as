import type { Transaction } from '../types'
import { formatCurrency, formatDate } from '../utils/formatters'

interface Props {
  transaction: Transaction | null
  onClose: () => void
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => void
}

export default function TransactionSheet({ transaction, onClose, onEdit, onDelete }: Props) {
  if (!transaction) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalhes da transação"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl"
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <span className="text-sm font-bold text-gray-900">Detalhes da Transação</span>
          <div className="flex gap-4">
            <button
              onClick={() => { onEdit(transaction); onClose() }}
              className="text-sm font-semibold text-indigo-600"
            >
              ✏️ Editar
            </button>
            <button
              onClick={() => { onDelete(transaction.id); onClose() }}
              className="text-sm font-semibold text-red-500"
            >
              🗑 Excluir
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-2xl">
            {transaction.type === 'income' ? '💰' : '💸'}
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">{transaction.title}</p>
            <p className={`text-2xl font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
              {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
            </p>
          </div>
        </div>
        <div className="divide-y divide-gray-50 pb-8">
          <div className="flex justify-between items-center px-5 py-3 text-sm">
            <span className="text-gray-400">📅 Data</span>
            <span className="font-medium text-gray-800">{formatDate(transaction.date)}</span>
          </div>
          <div className="flex justify-between items-center px-5 py-3 text-sm">
            <span className="text-gray-400">🏷 Categoria</span>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${transaction.type === 'income' ? 'bg-green-50 text-green-700' : 'bg-indigo-50 text-indigo-700'}`}>
              {transaction.categories?.name ?? '—'}
            </span>
          </div>
          <div className="flex justify-between items-center px-5 py-3 text-sm">
            <span className="text-gray-400">📝 Tipo</span>
            <span className="font-medium text-gray-800">
              {transaction.type === 'income' ? 'Receita' : 'Despesa'}
            </span>
          </div>
          {transaction.notes && (
            <div className="flex justify-between items-center px-5 py-3 text-sm">
              <span className="text-gray-400">📌 Observação</span>
              <span className="font-medium text-gray-800 max-w-[200px] text-right">{transaction.notes}</span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
