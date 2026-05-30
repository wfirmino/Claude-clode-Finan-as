export interface Category {
  id: string
  user_id: string
  name: string
  type: 'income' | 'expense'
  color: string
  created_at: string
}

export type Perfil = 'pessoal' | 'empresarial' | 'kommo'

export interface Transaction {
  id: string
  user_id: string
  category_id: string | null
  title: string
  amount: number
  type: 'income' | 'expense'
  date: string
  notes: string | null
  created_at: string
  categories?: Category
  // Perfil
  perfil?: Perfil
  nome_cliente?: string | null
  nome_empresa?: string | null
  divisao_socio?: number | null
  plano?: number | null
  num_usuarios?: number | null
  valor_total_assinatura?: number | null
  valor_liquido?: number | null
  valor_pago_kommo?: number | null
  divisao_socio_pct?: number | null
  valor_liquido_recebido?: number | null
  apenas_usuario_adicional?: boolean
  lancamento_simplificado?: boolean
  sem_comissao?: boolean
  forma_pagamento?: string
}

export interface EmpresarialConfig {
  user_id: string
  mes: string
  prolabore: number
}

export interface Goal {
  id: string
  user_id: string
  title: string
  target: number
  current: number
  deadline: string
  created_at: string
}

export interface MonthlyTotals {
  month: string
  income: number
  expense: number
}

export interface CategoryTotal {
  name: string
  value: number
  color: string
}

export type DatePreset = '' | 'last30' | 'last90' | 'thisMonth' | 'lastMonth' | 'last6months' | 'thisYear' | 'lastYear' | 'custom'
