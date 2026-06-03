import { useMemo } from 'react'
import type { Transaction } from '../types'
import type { Installment } from '../hooks/useInstallments'
import { formatCurrency } from '../utils/formatters'

interface Props {
  transactions: Transaction[]
  installments: Installment[]
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

export default function CartaoSummary({ transactions, installments, dueDay, periodo }: Props) {
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

  const { ativos, totalEmAberto } = useMemo(() => {
    const c = (n: number) => Math.round(n * 100)
    let ativos = 0, totalC = 0
    for (const inst of installments) {
      const restantes = inst.total_installments - inst.paid_installments
      if (restantes > 0) {
        ativos++
        totalC += c(inst.installment_amount) * restantes
      }
    }
    return { ativos, totalEmAberto: totalC / 100 }
  }, [installments])

  const daysUntil = getDaysUntilDue(dueDay)

  return (
    <div className="mb-6">
      {/* Painel resumo sem card */}
      <div className="mb-4 text-center">
        <p className="text-[22px] font-bold text-white leading-tight">Resumo {periodo}</p>
        <p className={`text-[13px] mt-1 ${dueColor(daysUntil)}`}>
          Vence em {daysUntil} dia{daysUntil !== 1 ? 's' : ''} (dia {dueDay})
        </p>
      </div>

      {/* 3 cards fatura */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="rounded-xl px-3 py-4 flex flex-col items-center justify-center text-center border border-gray-200 dark:border-white/10">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Fatura</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(fatura)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{compras} compra{compras !== 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-xl px-3 py-4 flex flex-col items-center justify-center text-center border border-gray-200 dark:border-white/10">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Pago</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400 tabular-nums">{formatCurrency(pago)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{pagamentos} pgto{pagamentos !== 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-xl px-3 py-4 flex flex-col items-center justify-center text-center border border-gray-200 dark:border-white/10">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Em aberto</p>
          <p className={`text-xl font-bold tabular-nums ${emAberto > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>{formatCurrency(emAberto)}</p>
          <p className={`text-xs mt-0.5 ${dueColor(daysUntil)}`}>vence em {daysUntil}d</p>
        </div>
      </div>

      {/* 2 cards parcelamentos */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl px-3 py-4 flex flex-col items-center justify-center text-center border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-900/10">
          <p className="text-xs font-medium text-indigo-500 dark:text-indigo-400 uppercase tracking-wide mb-1">Parcelamentos ativos</p>
          <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 tabular-nums">{ativos}</p>
          <p className="text-xs text-indigo-400 mt-0.5">em andamento</p>
        </div>
        <div className="rounded-xl px-3 py-4 flex flex-col items-center justify-center text-center border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">Total em aberto</p>
          <p className={`text-xl font-bold tabular-nums ${totalEmAberto > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-gray-400 dark:text-gray-500'}`}>{formatCurrency(totalEmAberto)}</p>
          <p className="text-xs text-amber-400 mt-0.5">parcelamentos</p>
        </div>
      </div>
    </div>
  )
}
