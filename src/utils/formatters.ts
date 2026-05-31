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

/** Converte número do banco (6734.74) para string pt-BR (6.734,74) para usar em inputs */
export function numToStr(n: number | null | undefined): string {
  if (n == null) return ''
  return n.toFixed(2).replace('.', ',')
}

/** Normaliza entrada pt-BR/US para float. Aceita: 1.234,56 | 1,234.56 | 497,88 | 497.88 */
export function parseBR(value: string): number {
  const s = value.trim()
  if (!s) return NaN
  if (s.includes(',') && s.includes('.')) {
    return s.lastIndexOf(',') > s.lastIndexOf('.')
      ? parseFloat(s.replace(/\./g, '').replace(',', '.'))
      : parseFloat(s.replace(/,/g, ''))
  }
  if (s.includes(',')) {
    if ((s.match(/,/g) ?? []).length > 1) return parseFloat(s.replace(/,/g, ''))
    return parseFloat(s.replace(',', '.'))
  }
  if (s.includes('.')) {
    const parts = s.split('.')
    const lastPart = parts[parts.length - 1]
    if (parts.length > 2) {
      if (lastPart.length <= 2) return parseFloat(parts.slice(0, -1).join('') + '.' + lastPart)
      return parseFloat(s.replace(/\./g, ''))
    }
    return lastPart.length <= 2 ? parseFloat(s) : parseFloat(s.replace(/\./g, ''))
  }
  return parseFloat(s)
}
