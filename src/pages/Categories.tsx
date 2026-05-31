import { useState, useRef } from 'react'
import { useCategories } from '../hooks/useCategories'
import type { Category } from '../types'
import { getErrorMessage } from '../utils/errors'
import Toast from '../components/Toast'
import Modal from '../components/Modal'

const COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6']

interface FormState { name: string; type: 'income' | 'expense'; color: string }
const defaultForm: FormState = { name: '', type: 'expense', color: '#6366f1' }

export default function Categories() {
  const { categories, loading, error, createCategory, updateCategory, deleteCategory } = useCategories()
  const [modal, setModal] = useState<{ open: boolean; editing: Category | null }>({ open: false, editing: null })
  const [form, setForm] = useState<FormState>(defaultForm)
  const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const toastId = useRef(0)

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ id: ++toastId.current, message, type })
  }

  function openCreate() {
    setForm(defaultForm)
    setModal({ open: true, editing: null })
  }

  function openEdit(cat: Category) {
    setForm({ name: cat.name, type: cat.type, color: cat.color })
    setModal({ open: true, editing: cat })
  }

  function closeModal() {
    setModal({ open: false, editing: null })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      if (modal.editing) {
        await updateCategory(modal.editing.id, form)
        showToast('Categoria atualizada.', 'success')
      } else {
        await createCategory(form)
        showToast('Categoria criada.', 'success')
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
      await deleteCategory(id)
      showToast('Categoria excluída.', 'success')
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    }
  }

  if (loading) return <p className="text-sm text-gray-400">Carregando...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Categorias</h2>
        <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          Nova Categoria
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-sm text-red-800 dark:text-red-400">
          Erro ao carregar categorias: {error}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-white/10 divide-y divide-gray-100 dark:divide-white/[0.06]">
        {categories.length === 0 && (
          <p className="p-6 text-sm text-gray-400 text-center">Nenhuma categoria cadastrada.</p>
        )}
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{cat.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.type === 'income' ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400'}`}>
                {cat.type === 'income' ? 'Receita' : 'Despesa'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {confirmDelete === cat.id ? (
                <>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Confirmar exclusão?</span>
                  <button onClick={() => handleDelete(cat.id)} className="text-sm text-red-600 font-medium hover:underline">Sim</button>
                  <button onClick={() => setConfirmDelete(null)} className="text-sm text-gray-500 hover:underline">Não</button>
                </>
              ) : (
                <>
                  <button onClick={() => openEdit(cat)} className="text-sm text-indigo-600 hover:underline">Editar</button>
                  <button onClick={() => setConfirmDelete(cat.id)} className="text-sm text-red-500 hover:underline">Excluir</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal open={modal.open} onClose={closeModal} titleId="category-modal-title">
        <h3 id="category-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {modal.editing ? 'Editar Categoria' : 'Nova Categoria'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="cat-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
            <input
              id="cat-name"
              type="text"
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border-gray-300 dark:border-[#2a2a2a] dark:bg-[#1a1a1a] dark:text-white text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="cat-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
            <select
              id="cat-type"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as 'income' | 'expense' }))}
              className="w-full rounded-lg border-gray-300 dark:border-[#2a2a2a] dark:bg-[#1a1a1a] dark:text-white text-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Selecionar cor ${c}`}
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg">Cancelar</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60">
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
