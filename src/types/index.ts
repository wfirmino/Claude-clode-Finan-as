export interface Category {
  id: string
  user_id: string
  name: string
  type: 'income' | 'expense'
  color: string
  created_at: string
}

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
