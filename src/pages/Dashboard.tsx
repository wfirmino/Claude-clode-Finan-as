import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useTransactions } from '../hooks/useTransactions'
import { useEmpresarialConfig } from '../hooks/useEmpresarialConfig'
import {
  calculateCategoryTotals,
  filterCurrentMonth,
  calculatePerfilMonthTotals,
  calculateKommoMonthTotals,
} from '../utils/calculations'
import { formatCurrency } from '../utils/formatters'

export default function Dashboard() {
  const { transactions, totalCount, loading, error } = useTransactions({ noLimit: true })
  const [activeTab, setActiveTab] = useState<'geral' | 'pessoal' | 'empresarial' | 'kommo'>('geral')

  const categoryTotals = useMemo(() => calculateCategoryTotals(filterCurrentMonth(transactions)), [transactions])
  const pessoal = useMemo(() => calculatePerfilMonthTotals(transactions, 'pessoal'), [transactions])
  const { prolabore } = useEmpresarialConfig()
  const empresarial = useMemo(() => calculatePerfilMonthTotals(transactions, 'empresarial'), [transactions])
  const kommo = useMemo(() => calculateKommoMonthTotals(transactions), [transactions])

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
          Valores calculados sobre {transactions.length.toLocaleString('pt-BR')} de {totalCount.toLocaleString('pt-BR')} transações. O limite do servidor foi atingido — os totais podem divergir do real.
        </div>
      )}

      {activeTab === 'geral' && (
        <>
          {/* Summary cards por perfil */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Pessoal', value: pessoal.balance, color: pessoal.balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400' },
              { label: 'Empresa', value: empresarial.balance, color: empresarial.balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400' },
              { label: 'Kommo', value: kommo.balance, color: kommo.balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400' },
            ].map(card => (
              <div key={card.label} className="rounded-xl border border-gray-200 dark:border-white/10 p-4 flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{card.label}</p>
                <p className={`text-lg font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
                <p className="text-[10px] text-gray-400 mt-1">30 dias</p>
              </div>
            ))}
          </div>

          {/* Gastos por categoria */}
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

      {activeTab === 'empresarial' && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Receitas do mês', value: empresarial.income, color: 'text-green-600 dark:text-green-400' },
            { label: 'Despesas do mês', value: empresarial.expense, color: 'text-red-600 dark:text-red-400' },
            { label: 'Saldo do mês', value: empresarial.balance, color: empresarial.balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400' },
            { label: 'Pró-labore', value: prolabore, color: 'text-indigo-600 dark:text-indigo-400' },
          ].map(card => (
            <div key={card.label} className="rounded-xl border border-gray-200 dark:border-white/10 p-5 flex flex-col items-center justify-center text-center">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'kommo' && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Receitas brutas', value: kommo.income, color: 'text-green-600 dark:text-green-400' },
            { label: 'Valor pago Kommo', value: kommo.valorPagoKommo, color: 'text-red-600 dark:text-red-400' },
            { label: 'Líquido recebido', value: kommo.valorLiquidoRecebido, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Saldo do mês', value: kommo.balance, color: kommo.balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400' },
          ].map(card => (
            <div key={card.label} className="rounded-xl border border-gray-200 dark:border-white/10 p-5 flex flex-col items-center justify-center text-center">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
