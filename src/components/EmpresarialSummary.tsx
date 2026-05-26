import { useState, useMemo, useEffect } from 'react'
import type { Transaction } from '../types'
import { formatCurrency } from '../utils/formatters'

interface Props {
  transactions: Transaction[]
  mes: string
  prolabore: number
  onSaveProlabore: (valor: number, mes: string) => Promise<void>
}

export default function EmpresarialSummary({ transactions, mes, prolabore: initialProlabore, onSaveProlabore }: Props) {
  const [prolaboreInput, setProlaboreInput] = useState(String(initialProlabore))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setProlaboreInput(String(initialProlabore))
  }, [initialProlabore])

  const { faturamento, totalSocio, despesaMEI, lucro } = useMemo(() => {
    const txsMes = transactions.filter(t => t.date.startsWith(mes))
    const fat = txsMes.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const soc = txsMes.reduce((s, t) => s + (t.divisao_socio ?? 0), 0)
    const mei = txsMes.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { faturamento: fat, totalSocio: soc, despesaMEI: mei, lucro: fat - soc - mei }
  }, [transactions, mes])

  const currentProlabore = parseFloat(prolaboreInput) || 0
  const caixa = lucro - currentProlabore

  async function handleSave() {
    setSaving(true)
    try { await onSaveProlabore(currentProlabore, mes) } finally { setSaving(false) }
  }

  const row = (label: string, value: number, highlight = false) => (
    <div key={label} className={`flex justify-between items-center py-2 ${highlight ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
      <span className="text-sm">{label}</span>
      <span className={`text-sm tabular-nums ${highlight ? 'text-indigo-700' : ''}`}>{formatCurrency(value)}</span>
    </div>
  )

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
      <h3 className="text-sm font-semibold text-indigo-700 mb-3">Resumo Empresarial — {mes}</h3>
      <div className="divide-y divide-indigo-100">
        {row('Faturamento total do mês', faturamento)}
        {row('Total dividido com sócio', totalSocio)}
        {row('Despesa MEI', despesaMEI)}
        {row('Lucro', lucro, true)}
      </div>
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-indigo-100">
        <label className="text-sm text-gray-600 shrink-0">Pró-labore (R$):</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={prolaboreInput}
          onChange={e => setProlaboreInput(e.target.value)}
          className="w-32 rounded border border-indigo-200 text-sm px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
      <div className={`flex justify-between items-center mt-2 pt-2 border-t border-indigo-100 font-semibold ${caixa >= 0 ? 'text-green-700' : 'text-red-600'}`}>
        <span className="text-sm">Caixa da empresa</span>
        <span className="text-sm tabular-nums">{formatCurrency(caixa)}</span>
      </div>
    </div>
  )
}
