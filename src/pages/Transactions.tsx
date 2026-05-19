import { useState } from 'react'
import { useTransactions, type TransactionFilters } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import type { Transaction } from '../types'
import { formatCurrency, formatDate } from '../utils/formatters'
import Toast from '../components/Toast'

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
  const { transactions, loading, createTransaction, updateTransaction, deleteTransaction } = useTransactions(filters)
  const { categories } = useCategories()
  const [modal, setModal] = useState<{ open: boolean; editing: Transaction | null }>({ open: false, editing: null })
  const [form, setForm] = useState<FormState>(defaultForm)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const paginated = transactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(transactions.length / PAGE_SIZE)

  function openCreate() {
    setForm(defaultForm)
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
    const values = {
      title: form.title,
      amount: parseFloat(form.amount),
      category_id: form.category_id || null,
      type: form.type,
      date: form.date,
      notes: form.notes || null,
    }
    try {
      if (modal.editing) {
        await updateTransaction(modal.editing.id, values)
        setToast({ message: 'Transação atualizada.', type: 'success' })
      } else {
        await createTransaction(values)
        setToast({ message: 'Transação criada.', type: 'success' })
      }
      closeModal()
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir transação?')) return
    try {
      await deleteTransaction(id)
      setToast({ message: 'Transação excluída.', type: 'success' })
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' })
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

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="date"
          value={filters.startDate ?? ''}
          onChange={e => { setFilters(f => ({ ...f, startDate: e.target.value || undefined })); setPage(0) }}
          className="rounded-lg border-gray-300 text-sm"
          placeholder="De"
        />
        <input
          type="date"
          value={filters.endDate ?? ''}
          onChange={e => { setFilters(f => ({ ...f, endDate: e.target.value || undefined })); setPage(0) }}
          className="rounded-lg border-gray-300 text-sm"
        />
        <select
          value={filters.type ?? ''}
          onChange={e => { setFilters(f => ({ ...f, type: (e.target.value as any) || undefined })); setPage(0) }}
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
                {['Data', 'Título', 'Categoria', 'Tipo', 'Valor', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
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
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(t)} className="text-indigo-600 hover:underline">Editar</button>
                      <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:underline">Excluir</button>
                    </div>
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

      {modal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {modal.editing ? 'Editar Transação' : 'Nova Transação'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select value={form.category_id} onChange={e => handleCategoryChange(e.target.value)} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                  <option value="">Sem categoria</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                  <input type="number" required min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observação (opcional)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
