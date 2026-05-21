import { useState, useMemo, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useInstallments, getNextDueDate, getStatus, type Installment, type InstallmentInput } from '../hooks/useInstallments'
import { formatCurrency, formatDate } from '../utils/formatters'
import { getErrorMessage } from '../utils/errors'
import Modal from '../components/Modal'
import Toast from '../components/Toast'

interface FormState {
  name: string
  original_amount: string
  interest_amount: string
  total_installments: string
  first_payment_date: string
  category: string
  notes: string
}

const defaultForm: FormState = {
  name: '',
  original_amount: '',
  interest_amount: '',
  total_installments: '',
  first_payment_date: new Date().toISOString().split('T')[0],
  category: '',
  notes: '',
}

function getMonthlyProjection(installments: Installment[]) {
  const today = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const year = today.getFullYear() + Math.floor((today.getMonth() + i) / 12)
    const month = (today.getMonth() + i) % 12
    const label = new Date(year, month, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    let total = 0
    for (const inst of installments) {
      if (inst.paid_installments >= inst.total_installments) continue
      const base = new Date(inst.first_payment_date + 'T12:00:00')
      for (let p = inst.paid_installments; p < inst.total_installments; p++) {
        const due = new Date(base.getFullYear(), base.getMonth() + p, base.getDate())
        if (due.getFullYear() === year && due.getMonth() === month) {
          total += inst.installment_amount
          break
        }
        if (due.getFullYear() > year || (due.getFullYear() === year && due.getMonth() > month)) break
      }
    }
    return { label, total }
  })
}

const STATUS_STYLE = {
  quitado: 'bg-gray-100 text-gray-500',
  em_dia: 'bg-green-50 text-green-700',
  vencido: 'bg-red-50 text-red-700',
}
const STATUS_LABEL = { quitado: 'Quitado', em_dia: 'Em dia', vencido: 'Vencido' }

export default function Installments() {
  const { installments, loading, error, createInstallment, updateInstallment, deleteInstallment, payNext } = useInstallments()
  const [modal, setModal] = useState<{ open: boolean; editing: Installment | null }>({ open: false, editing: null })
  const [form, setForm] = useState<FormState>(defaultForm)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' } | null>(null)
  const toastId = useRef(0)

  const derived = useMemo(() => {
    const original = parseFloat(form.original_amount)
    const interest = parseFloat(form.interest_amount) || 0
    const count = parseInt(form.total_installments)
    const total = !isNaN(original) && original > 0 ? original + interest : NaN
    const perInstallment = !isNaN(total) && !isNaN(count) && count > 0 ? total / count : null
    return { total: isNaN(total) ? null : total, perInstallment }
  }, [form.original_amount, form.interest_amount, form.total_installments])

  const summary = useMemo(() => {
    let totalAberto = 0
    let totalPago = 0
    let ativos = 0
    for (const inst of installments) {
      const status = getStatus(inst)
      totalPago += inst.installment_amount * inst.paid_installments
      if (status !== 'quitado') {
        totalAberto += inst.installment_amount * (inst.total_installments - inst.paid_installments)
        ativos++
      }
    }
    return { totalAberto, totalPago, ativos }
  }, [installments])

  const projection = useMemo(() => getMonthlyProjection(installments), [installments])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ id: ++toastId.current, message, type })
  }

  function openCreate() {
    setForm(defaultForm)
    setModal({ open: true, editing: null })
  }

  function openEdit(inst: Installment) {
    setForm({
      name: inst.name,
      original_amount: inst.original_amount != null ? String(inst.original_amount) : String(inst.total_amount),
      interest_amount: inst.interest_amount != null ? String(inst.interest_amount) : '',
      total_installments: String(inst.total_installments),
      first_payment_date: inst.first_payment_date,
      category: inst.category ?? '',
      notes: inst.notes ?? '',
    })
    setModal({ open: true, editing: inst })
  }

  function closeModal() { setModal({ open: false, editing: null }) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    const original = parseFloat(form.original_amount)
    const interest = parseFloat(form.interest_amount) || 0
    const count = parseInt(form.total_installments)
    if (isNaN(original) || original <= 0 || isNaN(count) || count <= 0) {
      showToast('Preencha valor original e número de parcelas corretamente.', 'error')
      return
    }
    const total = parseFloat((original + interest).toFixed(2))
    const values: InstallmentInput = {
      name: form.name,
      original_amount: original,
      interest_amount: interest,
      total_amount: total,
      total_installments: count,
      installment_amount: parseFloat((total / count).toFixed(2)),
      first_payment_date: form.first_payment_date,
      paid_installments: modal.editing?.paid_installments ?? 0,
      category: form.category || null,
      notes: form.notes || null,
    }
    setSubmitting(true)
    try {
      if (modal.editing) {
        await updateInstallment(modal.editing.id, values)
        showToast('Parcelamento atualizado.', 'success')
      } else {
        await createInstallment(values)
        showToast('Parcelamento criado.', 'success')
      }
      closeModal()
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePayNext(inst: Installment) {
    if (payingId) return
    setPayingId(inst.id)
    try {
      await payNext(inst.id, inst.paid_installments)
      showToast('Parcela marcada como paga.', 'success')
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setPayingId(null)
    }
  }

  async function handleDelete(id: string) {
    setConfirmDelete(null)
    try {
      await deleteInstallment(id)
      showToast('Parcelamento excluído.', 'success')
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    }
  }

  return (
    <div className="bg-white min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Parcelamentos</h2>
          <p className="text-sm text-gray-400 mt-0.5">Gerencie suas compras parceladas</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <span className="text-base leading-none">+</span> Novo Parcelamento
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          Erro ao carregar parcelamentos: {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 rounded-xl border border-red-100 px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">Total em aberto</span>
          </div>
          <p className="text-2xl font-bold text-red-600 tabular-nums">{formatCurrency(summary.totalAberto)}</p>
          <p className="text-xs text-red-400 mt-1">parcelas pendentes</p>
        </div>

        <div className="bg-green-50 rounded-xl border border-green-100 px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Total já pago</span>
          </div>
          <p className="text-2xl font-bold text-green-600 tabular-nums">{formatCurrency(summary.totalPago)}</p>
          <p className="text-xs text-green-500 mt-1">valor quitado</p>
        </div>

        <div className="bg-indigo-50 rounded-xl border border-indigo-100 px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Ativos</span>
          </div>
          <p className="text-2xl font-bold text-indigo-600 tabular-nums">{summary.ativos}</p>
          <p className="text-xs text-indigo-500 mt-1">parcelamentos</p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="rounded-xl border border-gray-200 px-5 py-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Impacto nos próximos 6 meses</h3>
        {installments.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Nenhum parcelamento para exibir</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={projection} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => v === 0 ? '' : formatCurrency(v).replace('R$ ', 'R$')}
                width={72}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value)), 'Total']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                cursor={{ fill: '#f3f4f6' }}
              />
              <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-gray-400 py-4">Carregando...</p>
      ) : installments.length === 0 ? (
        <div className="rounded-xl border border-gray-200 px-6 py-16 text-center">
          <p className="text-gray-400 text-base">Nenhum parcelamento cadastrado</p>
          <p className="text-sm text-gray-300 mt-1">Clique em "Novo Parcelamento" para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {installments.map(inst => {
            const status = getStatus(inst)
            const nextDue = status !== 'quitado' ? getNextDueDate(inst) : null
            const progress = Math.min((inst.paid_installments / inst.total_installments) * 100, 100)
            const remaining = inst.total_installments - inst.paid_installments
            const hasInterestInfo = inst.original_amount != null

            return (
              <div key={inst.id} className="rounded-xl border border-gray-200 bg-white px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 truncate">{inst.name}</span>
                      {inst.category && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full shrink-0">{inst.category}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_STYLE[status]}`}>
                        {STATUS_LABEL[status]}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mb-1">
                      {hasInterestInfo ? (
                        <>
                          <span>
                            Valor original: <span className="font-medium text-gray-700">{formatCurrency(inst.original_amount!)}</span>
                          </span>
                          <span>·</span>
                          <span>
                            Juros:{' '}
                            <span className={`font-medium ${inst.interest_amount && inst.interest_amount > 0 ? 'text-amber-600' : 'text-gray-700'}`}>
                              {formatCurrency(inst.interest_amount ?? 0)}
                            </span>
                          </span>
                          <span>·</span>
                          <span>Total: <span className="font-medium text-gray-700">{formatCurrency(inst.total_amount)}</span></span>
                        </>
                      ) : (
                        <span>Total: <span className="font-medium text-gray-700">{formatCurrency(inst.total_amount)}</span></span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <span>{formatCurrency(inst.installment_amount)}<span className="text-gray-400">/parcela</span></span>
                      {nextDue && (
                        <>
                          <span>·</span>
                          <span>Próxima: <span className="font-medium text-gray-700">{nextDue.toLocaleDateString('pt-BR')}</span></span>
                        </>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${status === 'quitado' ? 'bg-gray-400' : 'bg-indigo-500'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 tabular-nums shrink-0">
                        {inst.paid_installments}/{inst.total_installments}
                        {status !== 'quitado' && <span className="text-gray-400"> · {remaining} restante{remaining !== 1 ? 's' : ''}</span>}
                      </span>
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {status !== 'quitado' && (
                      <button
                        onClick={() => handlePayNext(inst)}
                        disabled={payingId === inst.id}
                        aria-label={`Pagar próxima parcela de ${inst.name}`}
                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
                      >
                        {payingId === inst.id ? 'Pagando...' : 'Pagar parcela'}
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(inst)}
                      aria-label={`Editar parcelamento ${inst.name}`}
                      className="px-3 py-1.5 text-xs text-indigo-600 font-medium hover:underline"
                    >
                      Editar
                    </button>
                    {confirmDelete === inst.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500">Excluir?</span>
                        <button onClick={() => handleDelete(inst.id)} className="text-xs text-red-600 font-medium hover:underline">Sim</button>
                        <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-400 hover:underline">Não</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(inst.id)}
                        aria-label={`Excluir parcelamento ${inst.name}`}
                        className="px-3 py-1.5 text-xs text-red-500 font-medium hover:underline"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Modal open={modal.open} onClose={closeModal} titleId="installment-modal-title">
        <h3 id="installment-modal-title" className="text-lg font-semibold text-gray-900 mb-4">
          {modal.editing ? 'Editar Parcelamento' : 'Novo Parcelamento'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="inst-name" className="block text-sm font-medium text-gray-700 mb-1">Nome da compra</label>
            <input
              id="inst-name"
              type="text"
              required
              placeholder="Ex: iPhone 15, Notebook..."
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="inst-original" className="block text-sm font-medium text-gray-700 mb-1">Valor original (R$)</label>
              <input
                id="inst-original"
                type="number"
                required
                min="0.01"
                step="0.01"
                placeholder="0,00"
                value={form.original_amount}
                onChange={e => setForm(f => ({ ...f, original_amount: e.target.value }))}
                className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="inst-interest" className="block text-sm font-medium text-gray-700 mb-1">
                Juros (R$) <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                id="inst-interest"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={form.interest_amount}
                onChange={e => setForm(f => ({ ...f, interest_amount: e.target.value }))}
                className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {derived.total !== null && (
            <div className="px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between text-sm">
              <span className="text-gray-500">Valor total</span>
              <span className="font-semibold text-gray-900">{formatCurrency(derived.total)}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="inst-count" className="block text-sm font-medium text-gray-700 mb-1">Nº de parcelas</label>
              <input
                id="inst-count"
                type="number"
                required
                min="1"
                max="360"
                step="1"
                placeholder="12"
                value={form.total_installments}
                onChange={e => setForm(f => ({ ...f, total_installments: e.target.value }))}
                className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="flex flex-col justify-end">
              {derived.perInstallment !== null && (
                <div className="px-3 py-2.5 bg-indigo-50 rounded-lg border border-indigo-100 flex items-center justify-between text-sm h-[38px]">
                  <span className="text-indigo-500">Por parcela</span>
                  <span className="font-semibold text-indigo-700">{formatCurrency(derived.perInstallment)}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="inst-date" className="block text-sm font-medium text-gray-700 mb-1">Data da primeira parcela</label>
            <input
              id="inst-date"
              type="date"
              required
              value={form.first_payment_date}
              onChange={e => setForm(f => ({ ...f, first_payment_date: e.target.value }))}
              className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="inst-category" className="block text-sm font-medium text-gray-700 mb-1">Categoria <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input
              id="inst-category"
              type="text"
              placeholder="Ex: Eletrônicos, Roupas..."
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="inst-notes" className="block text-sm font-medium text-gray-700 mb-1">Observação <span className="text-gray-400 font-normal">(opcional)</span></label>
            <textarea
              id="inst-notes"
              rows={2}
              placeholder="Notas adicionais..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600 rounded-lg transition-colors">Cancelar</button>
            <button type="submit" disabled={submitting} className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-60">
              {submitting ? 'Salvando...' : (modal.editing ? 'Salvar alterações' : 'Criar Parcelamento')}
            </button>
          </div>
        </form>
      </Modal>

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
