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
      <div className="border border-gray-200 dark:border-white/10 rounded-xl px-5 py-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Resumo {periodo}</span>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 tabular-nums">{pct}% pago</span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 mb-2">
          <div className={`h-2.5 rounded-full transition-all ${barColor(pct)}`} style={{ width: `${pct}%` }} />
        </div>
        <p className={`text-xs ${dueColor(daysUntil)}`}>
          Vence em {daysUntil} dia{daysUntil !== 1 ? 's' : ''} (dia {dueDay})
        </p>
      </div>

      {/* 3 cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl px-3 py-4 flex flex-col items-center justify-center text-center border border-gray-200 dark:border-white/10">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Fatura</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">{compras}</p>
          <p className="text-xs text-gray-400 mt-0.5">compra{compras !== 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-xl px-3 py-4 flex flex-col items-center justify-center text-center border border-gray-200 dark:border-white/10">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Pago</p>
          <p className="text-xl font-bold text-green-500 tabular-nums">{formatCurrency(pago)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{pagamentos} pgto{pagamentos !== 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-xl px-3 py-4 flex flex-col items-center justify-center text-center border border-gray-200 dark:border-white/10">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Em aberto</p>
          <p className={`text-xl font-bold tabular-nums ${emAberto > 0 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>{formatCurrency(emAberto)}</p>
          <p className={`text-xs mt-0.5 ${dueColor(daysUntil)}`}>vence em {daysUntil}d</p>
        </div>
      </div>
    </div>
  )
}
