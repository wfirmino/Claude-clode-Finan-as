import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Transaction } from '../types'

export interface TransactionFilters {
  startDate?: string
  endDate?: string
  type?: 'income' | 'expense'
  categoryId?: string
}

export function useTransactions(filters: TransactionFilters = {}) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('transactions').select('*, categories(*)').order('date', { ascending: false }).limit(500)
    if (filters.startDate) q = q.gte('date', filters.startDate)
    if (filters.endDate) q = q.lte('date', filters.endDate)
    if (filters.type) q = q.eq('type', filters.type)
    if (filters.categoryId) q = q.eq('category_id', filters.categoryId)
    const { data, error } = await q
    if (error) { setError(error.message); setLoading(false); return }
    setTransactions(data)
    setLoading(false)
  }, [filters.startDate, filters.endDate, filters.type, filters.categoryId])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function createTransaction(values: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'categories'>) {
    const { error } = await supabase.from('transactions').insert(values)
    if (error) throw error
    await fetchAll()
  }

  async function updateTransaction(id: string, values: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'categories'>) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('transactions').update(values).eq('id', id).eq('user_id', user?.id ?? '')
    if (error) throw error
    await fetchAll()
  }

  async function deleteTransaction(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', user?.id ?? '')
    if (error) throw error
    await fetchAll()
  }

  return { transactions, loading, error, createTransaction, updateTransaction, deleteTransaction, refetch: fetchAll }
}
