import { useState, useMemo } from 'react'
import type { Transaction } from '../types'
import { formatCurrency } from '../utils/formatters'

interface Props {
  transactions: Transaction[]
  periodo: string
}

export default function KommoSummary({ transactions, periodo }: Props) {
  const [open, setOpen] = useState(false)

  const totals = useMemo(() => {
    const c = (n: number) => Math.round(n * 100)
    let assinaturasC = 0, taxasC = 0, valorKommoC = 0, liquidaC = 0, socioC = 0, finalC = 0, semComissaoC = 0
    for (const t of transactions) {
      const vtC = c(t.valor_total_assinatura ?? 0)
      assinaturasC += vtC
      if (t.sem_comissao) { semComissaoC += vtC; continue }
      if (t.lancamento_simplificado) {
        const vlC = t.valor_liquido != null ? c(t.valor_liquido) : vtC
        const vlrC = t.valor_liquido_recebido != null ? c(t.valor_liquido_recebido) : vlC
        liquidaC += vlrC; finalC += vlrC
      } else {
        const vlC = c(t.valor_liquido ?? 0)
        const vkC = c(t.valor_pago_kommo ?? 0)
        const pct = t.divisao_socio_pct ?? 0
        const tLiqC = vlC - vkC
        const tSocioC = Math.round(tLiqC * pct / 100)
        taxasC += vtC - vlC; valorKommoC += vkC; liquidaC += tLiqC; socioC += tSocioC; finalC += tLiqC - tSocioC
      }
    }
    return {
      assinaturas: assinaturasC / 100, taxas: taxasC / 100, valorKommo: valorKommoC / 100,
      liquida: liquidaC / 100, socio: socioC / 100, final: finalC / 100, semComissao: semComissaoC / 100,
    }
  }, [transactions])

  const row = (label: string, value: number, highlight = false) => (
    <div key={label} className={`flex justify-between items-center py-2 ${highlight ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
      <span className="text-sm">{label}</span>
      <span className={`text-sm tabular-nums ${highlight ? 'text-purple-700 dark:text-purple-400' : ''}`}>{formatCurrency(value)}</span>
    </div>
  )

  return (
    <div className="border border-gray-200 dark:border-white/10 rounded-xl mb-6 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-400">
          Resumo Kommo — {periodo}
        </h3>
        <svg
          className={`w-4 h-4 text-purple-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className={`transition-all duration-200 ease-in-out overflow-hidden ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-4 pb-4 divide-y divide-purple-100 dark:divide-purple-800/50">
          {row('Total de assinaturas', totals.assinaturas)}
          {totals.semComissao > 0 && row('Repasses diretos (sem comissão)', totals.semComissao)}
          {row('Total taxas maquininha', totals.taxas)}
          {row('Total pago ao Kommo', totals.valorKommo)}
          {row('Total comissão líquida', totals.liquida)}
          {row('Total pago ao sócio', totals.socio)}
          {row('Total final do usuário', totals.final, true)}
        </div>
      </div>
    </div>
  )
}
