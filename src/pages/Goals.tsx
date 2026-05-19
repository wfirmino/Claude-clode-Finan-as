import { useState } from 'react'
import { useGoals } from '../hooks/useGoals'
import type { Goal } from '../types'
import { calculateGoalProgress, isGoalAtRisk } from '../utils/calculations'
import { formatCurrency, formatDate } from '../utils/formatters'
import { getErrorMessage } from '../utils/errors'
import Toast from '../components/Toast'

interface FormState { title: string; target: string; current: string; deadline: string }
const defaultForm: FormState = { title: '', target: '', current: '0', deadline: '' }

export default function Goals() {
  const { goals, loading, createGoal, updateGoal, deleteGoal } = useGoals()
  const [modal, setModal] = useState<{ open: boolean; editing: Goal | null }>({ open: false, editing: null })
  const [form, setForm] = useState<FormState>(defaultForm)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  function openCreate() { setForm(defaultForm); setModal({ open: true, editing: null }) }
  function openEdit(g: Goal) {
    setForm({ title: g.title, target: String(g.target), current: String(g.current), deadline: g.deadline })
    setModal({ open: true, editing: g })
  }
  function closeModal() { setModal({ open: false, editing: null }) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const values = { title: form.title, target: parseFloat(form.target), current: parseFloat(form.current), deadline: form.deadline }
    if (!isFinite(values.target) || values.target <= 0) {
      setToast({ message: 'Informe um valor alvo numérico maior que zero.', type: 'error' })
      return
    }
    if (!isFinite(values.current) || values.current < 0) {
      setToast({ message: 'Informe um valor atual numérico válido.', type: 'error' })
      return
    }
    if (values.current > values.target) {
      setToast({ message: 'O valor atual não pode ser maior que o valor alvo.', type: 'error' })
      return
    }
    try {
      if (modal.editing) {
        await updateGoal(modal.editing.id, values)
        setToast({ message: 'Meta atualizada.', type: 'success' })
      } else {
        await createGoal(values)
        setToast({ message: 'Meta criada.', type: 'success' })
      }
      closeModal()
    } catch (err) {
      setToast({ message: getErrorMessage(err), type: 'error' })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir meta?')) return
    try {
      await deleteGoal(id)
      setToast({ message: 'Meta excluída.', type: 'success' })
    } catch (err) {
      setToast({ message: getErrorMessage(err), type: 'error' })
    }
  }

  if (loading) return <p className="text-sm text-gray-400">Carregando...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Metas</h2>
        <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          Nova Meta
        </button>
      </div>

      {goals.length === 0 && <p className="text-sm text-gray-400 text-center py-12">Nenhuma meta cadastrada.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map(g => {
          const progress = calculateGoalProgress(g)
          const atRisk = isGoalAtRisk(g)
          return (
            <div key={g.id} className={`bg-white rounded-xl border p-5 ${atRisk ? 'border-amber-300' : 'border-gray-200'}`}>
              {atRisk && (
                <span className="inline-block mb-2 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  Atenção: prazo próximo
                </span>
              )}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900">{g.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Prazo: {formatDate(g.deadline)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(g)} className="text-sm text-indigo-600 hover:underline">Editar</button>
                  <button onClick={() => handleDelete(g.id)} className="text-sm text-red-500 hover:underline">Excluir</button>
                </div>
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{formatCurrency(g.current)} de {formatCurrency(g.target)}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${progress >= 100 ? 'bg-green-500' : atRisk ? 'bg-amber-400' : 'bg-indigo-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {modal.open && (
        <div role="presentation" className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div role="dialog" aria-modal="true" aria-labelledby="goal-modal-title" className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 id="goal-modal-title" className="text-lg font-semibold text-gray-900 mb-4">
              {modal.editing ? 'Editar Meta' : 'Nova Meta'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor alvo (R$)</label>
                  <input type="number" required min="0.01" step="0.01" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor atual (R$)</label>
                  <input type="number" required min="0" step="0.01" value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prazo</label>
                <input type="date" required value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast key={toast.message + toast.type} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
