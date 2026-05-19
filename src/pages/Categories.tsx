import { useState } from 'react'
import { useCategories } from '../hooks/useCategories'
import type { Category } from '../types'
import { getErrorMessage } from '../utils/errors'
import Toast from '../components/Toast'

const COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6']

interface FormState { name: string; type: 'income' | 'expense'; color: string }
const defaultForm: FormState = { name: '', type: 'expense', color: '#6366f1' }

export default function Categories() {
  const { categories, loading, createCategory, updateCategory, deleteCategory } = useCategories()
  const [modal, setModal] = useState<{ open: boolean; editing: Category | null }>({ open: false, editing: null })
  const [form, setForm] = useState<FormState>(defaultForm)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

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
    try {
      if (modal.editing) {
        await updateCategory(modal.editing.id, form)
        setToast({ message: 'Categoria atualizada.', type: 'success' })
      } else {
        await createCategory(form)
        setToast({ message: 'Categoria criada.', type: 'success' })
      }
      closeModal()
    } catch (err) {
      setToast({ message: getErrorMessage(err), type: 'error' })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir categoria?')) return
    try {
      await deleteCategory(id)
      setToast({ message: 'Categoria excluída.', type: 'success' })
    } catch (err) {
      setToast({ message: getErrorMessage(err), type: 'error' })
    }
  }

  if (loading) return <p className="text-sm text-gray-400">Carregando...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Categorias</h2>
        <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          Nova Categoria
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {categories.length === 0 && (
          <p className="p-6 text-sm text-gray-400 text-center">Nenhuma categoria cadastrada.</p>
        )}
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="text-sm font-medium text-gray-800">{cat.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.type === 'income' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {cat.type === 'income' ? 'Receita' : 'Despesa'}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(cat)} className="text-sm text-indigo-600 hover:underline">Editar</button>
              <button onClick={() => handleDelete(cat.id)} className="text-sm text-red-500 hover:underline">Excluir</button>
            </div>
          </div>
        ))}
      </div>

      {modal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {modal.editing ? 'Editar Categoria' : 'Nova Categoria'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as 'income' | 'expense' }))}
                  className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Selecionar cor ${c}`}
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
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
