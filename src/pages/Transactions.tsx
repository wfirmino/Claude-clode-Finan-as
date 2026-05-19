import { useState } from 'react'
import { useTransactions, type TransactionFilters } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import type { Transaction } from '../types'
import { formatCurrency, formatDate } from '../utils/formatters'
import { getErrorMessage } from '../utils/errors'
import Toast from '../components/Toast'
import Modal from '../components/Modal'

interface FormState {
  title: string
  amount: string
  category_id: string
  type: 'income' | 'expense'
  date: string
  notes: string
}

const defaultForm: FormState = {
  title: '', amount: '', category_id: '', type: 'expense',
  date: new Date().toISOString().split('T')[0], notes: '',
}

const PAGE_SIZE = 10

export default function Transactions() {
  const [filters, setFilters] = useState<TransactionFilters>({})
  const [page, setPage] = useState(0)
  const { transactions, loading, error, createTransaction, updateTransaction, deleteTransaction } = useTransactions(filters)
  const { categories } = useCategories()
  const [modal, setModal] = useState<{ open: boolean; editing: Transaction | null }>({ open: false, editing: null })
  const [form, setForm] = useState<FormState>(defaultForm)
  const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const paginated = transactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(transactions.length / PAGE_SIZE)

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ id: Date.now(), message, type })
  }

  function openCreate() {
    setForm({ ...defaultForm, date: new Date().toISOString().split('T')[0] })
    setModal({ open: true, editing: null })
  }

  function openEdit(t: Transaction) {
    setForm({ title: t.title, amount: String(t.amount), category_id: t.category_id ?? '', type: t.type, date: t.date, notes: t.notes ?? '' })
    setModal({ open: true, editing: t })
  }

  function closeModal() { setModal({ open: false, editing: null }) }

  function handleCategoryChange(catId: string) {
    const cat = categories.find(c => c.id === catId)
    setForm(f => ({ ...f, category_id: catId, type: cat?.type ?? f.type }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) {
      showToast('Informe um valor numérico maior que zero.', 'error')
      return
    }
    const values = {
      title: form.title,
      amount,
      category_id: form.category_id || null,
      type: form.type,
      date: form.date,
      notes: form.notes || null,
    }
    try {
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Transações</h2>
        <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          Nova Transação
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          Erro ao carregar transações: {error}
        </div>
      )}

      {transactions.length >= 500 && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Mostrando os 500 registros mais recentes. Use os filtros de data para visualizar períodos específicos.
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="date"
          value={filters.startDate ?? ''}
          onChange={e => { setFilters(f => ({ ...f, startDate: e.target.value || undefined })); setPage(0) }}
          className="rounded-lg border-gray-300 text-sm"
        />
        <input
          type="date"
          value={filters.endDate ?? ''}
          onChange={e => { setFilters(f => ({ ...f, endDate: e.target.value || undefined })); setPage(0) }}
          className="rounded-lg border-gray-300 text-sm"
        />
        <select
          value={filters.type ?? ''}
          onChange={e => { const v = e.target.value; setFilters(f => ({ ...f, type: (v === 'income' || v === 'expense') ? v : undefined })); setPage(0) }}
          className="rounded-lg border-gray-300 text-sm"
        >
          <option value="">Todos os tipos</option>
          <option value="income">Receita</option>
          <option value="expense">Despesa</option>
        </select>
        <select
          value={filters.categoryId ?? ''}
          onChange={e => { setFilters(f => ({ ...f, categoryId: e.target.value || undefined })); setPage(0) }}
          className="rounded-lg border-gray-300 text-sm"
        >
          <option value="">Todas as categorias</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Data', 'Título', 'Categoria', 'Tipo', 'Valor', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h !== 'Ações' ? h : ''}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nenhuma transação encontrada.</td></tr>
              )}
              {paginated.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{formatDate(t.date)}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{t.title}</td>
                  <td className="px-4 py-3 text-gray-500">{t.categories?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.type === 'income' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {t.type === 'income' ? 'Receita' : 'Despesa'}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </td>
                  <td className="px-4 py-3">
                    {confirmDelete === t.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">Confirmar?</span>
                        <button onClick={() => handleDelete(t.id)} className="text-red-600 text-xs font-medium hover:underline">Sim</button>
                        <button onClick={() => setConfirmDelete(null)} className="text-gray-500 text-xs hover:underline">Não</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(t)} className="text-indigo-600 hover:underline">Editar</button>
                        <button onClick={() => setConfirmDelete(t.id)} className="text-red-500 hover:underline">Excluir</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-sm text-indigo-600 disabled:opacity-40">← Anterior</button>
              <span className="text-sm text-gray-500">{page + 1} / {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="text-sm text-indigo-600 disabled:opacity-40">Próxima →</button>
            </div>
          )}
        </div>
      )}

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
            <label htmlFor="tx-category" className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select id="tx-category" value={form.category_id} onChange={e => handleCategoryChange(e.target.value)} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500">
              <option value="">Sem categoria</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
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
            <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">Salvar</button>
          </div>
        </form>
      </Modal>

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
