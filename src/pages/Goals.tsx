import { useState, useRef } from 'react'
import { useGoals } from '../hooks/useGoals'
import type { Goal } from '../types'
import { calculateGoalProgress, isGoalAtRisk } from '../utils/calculations'
import { formatCurrency, formatDate, numToStr, parseBR } from '../utils/formatters'
import { getErrorMessage } from '../utils/errors'
import Toast from '../components/Toast'
import Modal from '../components/Modal'

interface FormState { title: string; target: string; current: string; deadline: string }
const defaultForm: FormState = { title: '', target: '', current: '0', deadline: '' }

export default function Goals() {
  const { goals, loading, error, createGoal, updateGoal, deleteGoal } = useGoals()
  const [modal, setModal] = useState<{ open: boolean; editing: Goal | null }>({ open: false, editing: null })
  const [form, setForm] = useState<FormState>(defaultForm)
  const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const toastId = useRef(0)

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ id: ++toastId.current, message, type })
  }

  function openCreate() { setForm(defaultForm); setModal({ open: true, editing: null }) }
  function openEdit(g: Goal) {
    setForm({ title: g.title, target: numToStr(g.target), current: numToStr(g.current), deadline: g.deadline })
    setModal({ open: true, editing: g })
  }
  function closeModal() { setModal({ open: false, editing: null }) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const values = { title: form.title, target: parseBR(form.target), current: parseBR(form.current), deadline: form.deadline }
    if (!isFinite(values.target) || values.target <= 0) {
      showToast('Informe um valor alvo numérico maior que zero.', 'error')
      return
    }
    if (!isFinite(values.current) || values.current < 0) {
      showToast('Informe um valor atual numérico válido.', 'error')
      return
    }
    if (values.current > values.target) {
      showToast('O valor atual não pode ser maior que o valor alvo.', 'error')
      return
    }
    if (submitting) return
    setSubmitting(true)
    try {
      if (modal.editing) {
        await updateGoal(modal.editing.id, values)
        showToast('Meta atualizada.', 'success')
      } else {
        await createGoal(values)
        showToast('Meta criada.', 'success')
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
      await deleteGoal(id)
      showToast('Meta excluída.', 'success')
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
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

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          Erro ao carregar metas: {error}
        </div>
      )}

      {goals.length === 0 && !error && <p className="text-sm text-gray-400 text-center py-12">Nenhuma meta cadastrada.</p>}

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
                <div className="flex items-center gap-2">
                  {confirmDelete === g.id ? (
                    <>
                      <span className="text-xs text-gray-600">Confirmar?</span>
                      <button onClick={() => handleDelete(g.id)} className="text-sm text-red-600 font-medium hover:underline">Sim</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-sm text-gray-500 hover:underline">Não</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => openEdit(g)} className="text-sm text-indigo-600 hover:underline">Editar</button>
                      <button onClick={() => setConfirmDelete(g.id)} className="text-sm text-red-500 hover:underline">Excluir</button>
                    </>
                  )}
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

      <Modal open={modal.open} onClose={closeModal} titleId="goal-modal-title">
        <h3 id="goal-modal-title" className="text-lg font-semibold text-gray-900 mb-4">
          {modal.editing ? 'Editar Meta' : 'Nova Meta'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="goal-title" className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input id="goal-title" type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="goal-target" className="block text-sm font-medium text-gray-700 mb-1">Valor alvo (R$)</label>
              <input id="goal-target" type="text" inputMode="decimal" required placeholder="0,00" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label htmlFor="goal-current" className="block text-sm font-medium text-gray-700 mb-1">Valor atual (R$)</label>
              <input id="goal-current" type="text" inputMode="decimal" required placeholder="0,00" value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
          </div>
          <div>
            <label htmlFor="goal-deadline" className="block text-sm font-medium text-gray-700 mb-1">Prazo</label>
            <input id="goal-deadline" type="date" required value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
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
