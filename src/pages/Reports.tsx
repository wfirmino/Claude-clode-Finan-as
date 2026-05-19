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

  const filters = useMemo<TransactionFilters>(() => {
    const today = new Date().toISOString().split('T')[0]
    const dates = period === 'custom' ? custom : getPeriodDates(period)
    return {
      startDate: dates.startDate || undefined,
      endDate: dates.endDate || today,
    }
  }, [period, custom])

  const { transactions, loading, error } = useTransactions(filters)

  const categoryTotals = useMemo(() => calculateCategoryTotals(transactions), [transactions])
  const totalExpense = useMemo(() => transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0), [transactions])
  const totalIncome = useMemo(() => transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0), [transactions])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Relatórios</h2>
        <button
          onClick={() => exportTransactionsToCSV(transactions)}
          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Exportar CSV
        </button>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap gap-2">
        {(['month', 'quarter', 'year', 'custom'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${period === p ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
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
              className="rounded-lg border-gray-300 text-sm"
            />
            <span className="text-gray-400 text-sm">até</span>
            <input
              type="date"
              value={custom.endDate}
              min={custom.startDate || undefined}
              onChange={e => setCustom(c => ({ ...c, endDate: e.target.value }))}
              className="rounded-lg border-gray-300 text-sm"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          Erro ao carregar transações: {error}
        </div>
      )}

      {loading ? <p className="text-sm text-gray-400">Carregando...</p> : (
        <>
          {/* Totals */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Total de Receitas</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Total de Despesas</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
            </div>
          </div>

          {/* Category chart */}
          {categoryTotals.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-medium text-gray-700 mb-4">Despesas por categoria</p>
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
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Data', 'Título', 'Categoria', 'Tipo', 'Valor'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhuma transação no período.</td></tr>
                )}
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{formatDate(t.date)}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{t.title}</td>
                    <td className="px-4 py-3 text-gray-500">{t.categories?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.type === 'income' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
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
