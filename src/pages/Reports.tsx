import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useTransactions } from '../hooks/useTransactions'
import { calculateCategoryTotals } from '../utils/calculations'
import { formatCurrency, formatDate } from '../utils/formatters'
import { exportTransactionsToCSV } from '../utils/csv'
import type { TransactionFilters } from '../hooks/useTransactions'

type Period = 'month' | 'quarter' | 'year' | 'custom'

function getPeriodDates(period: Period): { startDate: string; endDate: string } {
  const now = new Date()
  const end = now.toISOString().split('T')[0]
  if (period === 'month') {
    return { startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], endDate: end }
  }
  if (period === 'quarter') {
    return { startDate: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0], endDate: end }
  }
  // 'year' is the last named period; 'custom' is handled by the caller before reaching this function
  return { startDate: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0], endDate: end }
}

export default function Reports() {
  const [period, setPeriod] = useState<Period>('month')
  const [custom, setCustom] = useState({ startDate: '', endDate: '' })
  const [includeCards, setIncludeCards] = useState(false)

  const filters = useMemo<TransactionFilters>(() => {
    const today = new Date().toISOString().split('T')[0]
    const dates = period === 'custom' ? custom : getPeriodDates(period)
    return {
      startDate: dates.startDate || undefined,
      endDate: dates.endDate || today,
    }
  }, [period, custom])

  const { transactions, loading, error } = useTransactions(filters)

  const cardFilters = useMemo<TransactionFilters>(() => ({
    ...filters,
    perfil: 'cartao',
  }), [filters])
  const { transactions: cardTxs } = useTransactions(includeCards ? cardFilters : { perfil: 'cartao', noLimit: false, startDate: '1900-01-01', endDate: '1900-01-01' })
  const allTransactions = useMemo(
    () => includeCards ? [...transactions, ...cardTxs] : transactions,
    [transactions, cardTxs, includeCards]
  )

  const categoryTotals = useMemo(() => calculateCategoryTotals(allTransactions), [allTransactions])
  const totalExpense = useMemo(() => allTransactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0), [allTransactions])
  const totalIncome = useMemo(() => allTransactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0), [allTransactions])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Relatórios</h2>
        <button
          onClick={() => exportTransactionsToCSV(allTransactions)}
          className="px-4 py-2 border border-gray-300 dark:border-[#2a2a2a] text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors"
        >
          Exportar CSV
        </button>
      </div>

      {/* Card toggle */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-lg">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={includeCards}
              onChange={e => setIncludeCards(e.target.checked)}
            />
            <div className="w-9 h-5 bg-gray-200 dark:bg-[#2a2a2a] rounded-full peer peer-checked:bg-indigo-600 transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Incluir transações de cartão</span>
        </label>
        {includeCards && (
          <p className="text-xs text-amber-600">
            ⚠️ Pode duplicar valores se o pagamento da fatura já está em Pessoal.
          </p>
        )}
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap gap-2">
        {(['month', 'quarter', 'year', 'custom'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${period === p ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#2a2a2a] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'}`}
          >
            {{ month: 'Este mês', quarter: 'Trimestre', year: 'Este ano', custom: 'Personalizado' }[p]}
          </button>
        ))}
        {period === 'custom' && (
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={custom.startDate}
              max={custom.endDate || undefined}
              onChange={e => setCustom(c => ({ ...c, startDate: e.target.value }))}
              className="rounded-lg border-gray-300 dark:border-[#2a2a2a] dark:bg-[#1a1a1a] dark:text-white text-sm"
            />
            <span className="text-gray-400 dark:text-gray-500 text-sm">até</span>
            <input
              type="date"
              value={custom.endDate}
              min={custom.startDate || undefined}
              onChange={e => setCustom(c => ({ ...c, endDate: e.target.value }))}
              className="rounded-lg border-gray-300 dark:border-[#2a2a2a] dark:bg-[#1a1a1a] dark:text-white text-sm"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-sm text-red-800 dark:text-red-400">
          Erro ao carregar transações: {error}
        </div>
      )}

      {allTransactions.length >= 500 && !loading && (
        <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg text-sm text-amber-800 dark:text-amber-400">
          Mostrando os 500 registros mais recentes. Os totais do período podem estar incompletos.
        </div>
      )}

      {loading ? <p className="text-sm text-gray-400">Carregando...</p> : (
        <>
          {/* Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 dark:border-white/10 p-5 flex flex-col items-center justify-center text-center">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Total de Receitas</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-white/10 p-5 flex flex-col items-center justify-center text-center">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Total de Despesas</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalExpense)}</p>
            </div>
          </div>

          {/* Category chart */}
          {categoryTotals.length > 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-white/10 p-5">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Despesas por categoria</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={categoryTotals} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => formatCurrency(Number(v))} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {categoryTotals.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Transactions table */}
          <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/[0.04] border-b border-gray-100 dark:border-white/[0.06]">
                <tr>
                  {['Data', 'Título', 'Categoria', 'Tipo', 'Valor'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                {allTransactions.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">Nenhuma transação no período.</td></tr>
                )}
                {allTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-[#222222]">
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(t.date)}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{t.title}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{t.categories?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.type === 'income' ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400'}`}>
                        {t.type === 'income' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
