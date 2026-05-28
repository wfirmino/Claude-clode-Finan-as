import { useMemo } from 'react'
import type { Transaction } from '../types'
import { formatCurrency } from '../utils/formatters'

interface Props {
  transactions: Transaction[]
  mes: string
}

export default function KommoSummary({ transactions, mes }: Props) {
  const totals = useMemo(() => {
    let assinaturas = 0, taxas = 0, kommo65 = 0, bruta35 = 0, liquida = 0, socio = 0, final = 0
    for (const t of transactions) {
      const vt = t.valor_total_assinatura ?? 0
      const vl = t.valor_liquido ?? 0
      const pct = t.divisao_socio_pct ?? 0
      const taxa = vt - vl
      const b = vt * 0.35
      const liq = b - taxa
      const s = liq * pct / 100
      assinaturas += vt
      taxas += taxa
      kommo65 += vt * 0.65
      bruta35 += b
      liquida += liq
      socio += s
      final += liq - s
    }
    return { assinaturas, taxas, kommo65, bruta35, liquida, socio, final }
  }, [transactions])

  const row = (label: string, value: number, highlight = false) => (
    <div key={label} className={`flex justify-between items-center py-2 ${highlight ? 'font-semibold' : 'text-gray-600'}`}>
      <span className="text-sm">{label}</span>
      <span className={`text-sm tabular-nums ${highlight ? 'text-purple-700' : ''}`}>{formatCurrency(value)}</span>
    </div>
  )

  return (
    <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-6">
      <h3 className="text-sm font-semibold text-purple-700 mb-3">Resumo Kommo — {mes}</h3>
      <div className="divide-y divide-purple-100">
        {row('Total de assinaturas', totals.assinaturas)}
        {row('Total taxas maquininha', totals.taxas)}
        {row('Total comissão Kommo (65%)', totals.kommo65)}
        {row('Total comissão bruta (35%)', totals.bruta35)}
        {row('Total comissão líquida', totals.liquida)}
        {row('Total pago ao sócio', totals.socio)}
        {row('Total final do usuário', totals.final, true)}
      </div>
    </div>
  )
}
