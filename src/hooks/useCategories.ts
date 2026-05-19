import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Category } from '../types'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data, error } = await supabase.from('categories').select('*').order('name')
    if (error) { setError(error.message); setLoading(false); return }
    setCategories(data)
    setLoading(false)
  }

  async function createCategory(values: Pick<Category, 'name' | 'type' | 'color'>) {
    const { error } = await supabase.from('categories').insert(values)
    if (error) throw error
    await fetchAll()
  }

  async function updateCategory(id: string, values: Pick<Category, 'name' | 'type' | 'color'>) {
    const { error } = await supabase.from('categories').update(values).eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  async function deleteCategory(id: string) {
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id) as { count: number | null; error: unknown }
    if ((count ?? 0) > 0) throw new Error('Não é possível excluir uma categoria com transações vinculadas.')
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  return { categories, loading, error, createCategory, updateCategory, deleteCategory }
}
