import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useTransactions } from '../hooks/useTransactions'
import {
  calculateBalance,
  calculateCurrentMonthTotals,
  calculateMonthlyTotals,
  calculateCategoryTotals,
  filterCurrentMonth,
} from '../utils/calculations'
import { formatCurrency, formatDate } from '../utils/formatters'

export default function Dashboard() {
  const { transactions, loading, error } = useTransactions()

  const balance = useMemo(() => calculateBalance(transactions), [transactions])
  const { income, expense } = useMemo(() => calculateCurrentMonthTotals(transactions), [transactions])
  const monthly = useMemo(() => calculateMonthlyTotals(transactions, 6), [transactions])
  const categoryTotals = useMemo(() => calculateCategoryTotals(filterCurrentMonth(transactions)), [transactions])
  const recent = useMemo(() => transactions.slice(0, 5), [transactions])

  if (loading) return <p className="text-sm text-gray-400">Carregando...</p>

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          Erro ao carregar transações: {error}
        </div>
      )}

      {transactions.length >= 500 && (
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Saldo calculado sobre os 500 registros mais recentes. Histórico completo pode divergir.
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Saldo atual', value: balance, color: balance >= 0 ? 'text-gray-900' : 'text-red-600' },
          { label: 'Receitas do mês', value: income, color: 'text-green-600' },
          { label: 'Despesas do mês', value: expense, color: 'text-red-600' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-700 mb-4">Gastos por categoria (mês atual)</p>
          {categoryTotals.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryTotals} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                  {categoryTotals.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-700 mb-4">Receitas vs Despesas (6 meses)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => { const n = Number(v); return n >= 1000 ? `R$${(n / 1000).toFixed(0)}k` : `R$${n}` }} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Legend />
              <Bar dataKey="income" name="Receita" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-gray-700">Últimas transações</p>
          <Link to="/transactions" className="text-sm text-indigo-600 hover:underline">Ver todas</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhuma transação registrada.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {recent.map(t => (
              <div key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{t.title}</p>
                  <p className="text-xs text-gray-400">{t.categories?.name ?? '—'} · {formatDate(t.date)}</p>
                </div>
                <span className={`text-sm font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
