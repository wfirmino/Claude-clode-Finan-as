import type { Transaction } from '../types'

// Prefix cells that start with formula characters to prevent CSV injection in Excel/Sheets
function sanitizeCell(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value
}

export function buildCSVContent(transactions: Transaction[]): string {
  const headers = ['Data', 'Título', 'Tipo', 'Categoria', 'Valor', 'Observação']
  const rows = transactions.map(t => [
    t.date,
    sanitizeCell(t.title),
    t.type === 'income' ? 'Receita' : 'Despesa',
    sanitizeCell(t.categories?.name ?? ''),
    t.amount.toFixed(2),
    sanitizeCell(t.notes ?? ''),
  ])
  return [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

export function exportTransactionsToCSV(transactions: Transaction[], filename = 'transacoes.csv'): void {
  const csvContent = buildCSVContent(transactions)
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
