import { parseDateLocal } from './calculations'

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR').format(parseDateLocal(dateStr))
  } catch {
    return dateStr
  }
}
