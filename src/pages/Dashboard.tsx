import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useTransactions } from '../hooks/useTransactions'
import {
  calculateBalance,
  calculateCurrentMonthTotals,
  calculateMonthlyTotals,
  calculateCategoryTotals,
  filterCurrentMonth,
  calculatePerfilMonthTotals,
} from '../utils/calculations'
import { formatCurrency, formatDate } from '../utils/formatters'

export default function Dashboard() {
  const { transactions, totalCount, loading, error } = useTransactions({ noLimit: true })
  const [activeTab, setActiveTab] = useState<'geral' | 'pessoal' | 'empresarial' | 'kommo'>('geral')

  const balance = useMemo(() => calculateBalance(transactions), [transactions])
  const { income, expense } = useMemo(() => calculateCurrentMonthTotals(transactions), [transactions])
  const monthly = useMemo(() => calculateMonthlyTotals(transactions, 6), [transactions])
  const categoryTotals = useMemo(() => calculateCategoryTotals(filterCurrentMonth(transactions)), [transactions])
  const recent = useMemo(() => transactions.slice(0, 5), [transactions])
  const pessoal = useMemo(() => calculatePerfilMonthTotals(transactions, 'pessoal'), [transactions])

  if (loading) return <p className="text-sm text-gray-400">Carregando...</p>

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Dashboard</h2>

      <div className="flex border-b border-gray-200 dark:border-white/10">
        {(['geral', 'pessoal', 'empresarial', 'kommo'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-400">
          Erro ao carregar transações: {error}
        </div>
      )}

      {totalCount !== null && transactions.length < totalCount && (
        <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-400">
          Saldo calculado sobre {transactions.length.toLocaleString('pt-BR')} de {totalCount.toLocaleString('pt-BR')} transações. O limite do servidor foi atingido — o saldo pode divergir do total real.
        </div>
      )}

      {activeTab === 'geral' && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Saldo atual', value: balance, color: balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400' },
              { label: 'Receitas do mês', value: income, color: 'text-green-600 dark:text-green-400' },
              { label: 'Despesas do mês', value: expense, color: 'text-red-600 dark:text-red-400' },
            ].map((card, i) => (
              <div key={card.label} className={`rounded-xl border border-gray-200 dark:border-white/10 p-5 flex flex-col items-center justify-center text-center ${i === 2 ? 'col-span-2 md:col-span-1' : ''}`}>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{card.label}</p>
                <p className={`text-2xl font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-gray-200 dark:border-white/10 p-5">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Gastos por categoria (mês atual)</p>
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

            <div className="rounded-xl border border-gray-200 dark:border-white/10 p-5">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Receitas vs Despesas (6 meses)</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthly}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => { const n = Number(v); return n >= 1000 ? `R$${(n / 1000).toFixed(0)}k` : `R$${n}` }} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Legend />
                  <Bar dataKey="income" name="Receita" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent transactions */}
          <div className="rounded-xl border border-gray-200 dark:border-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Últimas transações</p>
              <Link to="/transactions" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Ver todas</Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhuma transação registrada.</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                {recent.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{t.title}</p>
                      <p className="text-xs text-gray-400">{t.categories?.name ?? '—'} · {formatDate(t.date)}</p>
                    </div>
                    <span className={`text-sm font-medium ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'pessoal' && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Receitas do mês', value: pessoal.income, color: 'text-green-600 dark:text-green-400' },
            { label: 'Despesas do mês', value: pessoal.expense, color: 'text-red-600 dark:text-red-400' },
            { label: 'Saldo do mês', value: pessoal.balance, color: pessoal.balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400' },
          ].map((card, i) => (
            <div key={card.label} className={`rounded-xl border border-gray-200 dark:border-white/10 p-5 flex flex-col items-center justify-center text-center ${i === 2 ? 'col-span-2' : ''}`}>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
