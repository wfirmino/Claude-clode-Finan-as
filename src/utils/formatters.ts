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

/**
 * Máscara de moeda em tempo real para inputs pt-BR.
 * Mantém apenas dígitos e vírgula, adiciona pontos de milhar.
 * ex: "30000" → "30.000" | "30000,5" → "30.000,5" | "30000,50" → "30.000,50"
 */
export function maskCurrency(raw: string): string {
  const hasSep = raw.includes(',')
  const clean = raw.replace(/[^\d,]/g, '')
  const [intRaw = '', decRaw = ''] = clean.split(',')
  const cleanInt = intRaw.replace(/^0+(\d)/, '$1') || (hasSep ? '0' : '')
  const formattedInt = cleanInt.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  if (hasSep) return `${formattedInt},${decRaw.slice(0, 2)}`
  return formattedInt
}

/**
 * Valida se a string é um input de moeda bem formado antes de parsear.
 * Rejeita: múltiplas vírgulas sem ponto ("1,2,3"), múltiplos pontos onde
 * os segmentos não têm 3 dígitos ("1.2.3"), e caracteres não numéricos.
 */
export function isValidCurrencyInput(s: string): boolean {
  const t = s.trim()
  if (!t || !/^[\d.,]+$/.test(t)) return false
  // rejeita separador no final ou início (ex: "10.", ",50")
  if (/[.,]$/.test(t) || /^[.,]/.test(t)) return false
  const commas = (t.match(/,/g) ?? []).length
  const dots = (t.match(/\./g) ?? []).length
  // múltiplas vírgulas sem ponto → inválido (ex: "1,2,3")
  if (commas > 1 && dots === 0) return false
  // múltiplos pontos sem vírgula → separadores de milhar; todos segmentos não-iniciais devem ter 3 dígitos
  if (dots > 1 && commas === 0) {
    const parts = t.split('.')
    return parts.every((p, i) => i === 0 || p.length === 3)
  }
  return true
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
