import { useMemo } from 'react'
import type { Transaction } from '../types'
import { formatCurrency } from '../utils/formatters'

interface Props {
  transactions: Transaction[]
  dueDay: number
  periodo: string
}

function getDaysUntilDue(dueDay: number): number {
  const today = new Date()
  let due = new Date(today.getFullYear(), today.getMonth(), dueDay)
  if (due <= today) due = new Date(today.getFullYear(), today.getMonth() + 1, dueDay)
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function dueColor(days: number) {
  if (days <= 3) return 'text-red-600'
  if (days <= 7) return 'text-amber-500'
  return 'text-gray-500'
}

function barColor(pct: number) {
  if (pct >= 80) return 'bg-green-500'
  if (pct >= 40) return 'bg-amber-400'
  return 'bg-red-500'
}

export default function CartaoSummary({ transactions, dueDay, periodo }: Props) {
  const { fatura, pago, emAberto, compras, pagamentos } = useMemo(() => {
    const c = (n: number) => Math.round(n * 100)
    let faturaC = 0, pagoC = 0, compras = 0, pagamentos = 0
    for (const t of transactions) {
      if (t.type === 'expense') { faturaC += c(t.amount); compras++ }
      else { pagoC += c(t.amount); pagamentos++ }
    }
    return {
      fatura: faturaC / 100,
      pago: pagoC / 100,
      emAberto: Math.max(0, (faturaC - pagoC) / 100),
      compras,
      pagamentos,
    }
  }, [transactions])

  const pct = fatura > 0 ? Math.min(100, Math.round((pago / fatura) * 100)) : 0
  const daysUntil = getDaysUntilDue(dueDay)

  return (
    <div className="mb-6">
      {/* Progress bar panel */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Resumo {periodo}</span>
          <span className="text-sm font-medium text-gray-600 tabular-nums">{pct}% pago</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
          <div className={`h-2.5 rounded-full transition-all ${barColor(pct)}`} style={{ width: `${pct}%` }} />
        </div>
        <p className={`text-xs ${dueColor(daysUntil)}`}>
          Vence em {daysUntil} dia{daysUntil !== 1 ? 's' : ''} (dia {dueDay})
        </p>
      </div>

      {/* 3 cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">💳 FATURA</p>
          <p className="text-xl font-bold text-indigo-700 tabular-nums">{compras}</p>
          <p className="text-xs text-indigo-400 mt-0.5">compra{compras !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">✅ Recebido</p>
          <p className="text-xl font-bold text-green-700 tabular-nums">{formatCurrency(pago)}</p>
          <p className="text-xs text-green-400 mt-0.5">{pagamentos} pagamento{pagamentos !== 1 ? 's' : ''}</p>
        </div>
        <div className={`border rounded-xl px-4 py-3 ${emAberto > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${emAberto > 0 ? 'text-red-500' : 'text-gray-400'}`}>⏳ EM ABERTO</p>
          <p className={`text-xl font-bold tabular-nums ${emAberto > 0 ? 'text-red-600' : 'text-gray-400'}`}>{formatCurrency(emAberto)}</p>
          <p className={`text-xs mt-0.5 ${dueColor(daysUntil)}`}>vence em {daysUntil}d</p>
        </div>
      </div>
    </div>
  )
}
