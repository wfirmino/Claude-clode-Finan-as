import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Category } from '../types'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.from('categories').select('*').order('name')
    if (error) { setError(error.message); setLoading(false); return }
    setCategories(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function createCategory(values: Pick<Category, 'name' | 'type' | 'color'>): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('Não autenticado')
    const { data, error } = await supabase.from('categories').insert({ ...values, user_id: session.user.id }).select('id').single()
    if (error) throw error
    await fetchAll()
    return data.id
  }

  async function updateCategory(id: string, values: Pick<Category, 'name' | 'type' | 'color'>) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('Não autenticado')
    const { error } = await supabase.from('categories').update(values).eq('id', id).eq('user_id', session.user.id)
    if (error) throw error
    await fetchAll()
  }

  async function deleteCategory(id: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('Não autenticado')
    const { error } = await supabase.from('categories').delete().eq('id', id).eq('user_id', session.user.id)
    // category_id FK is ON DELETE SET NULL, so 23503 won't fire via normal delete.
    // Guard remains as a safety net if a future migration tightens the constraint.
    if (error?.code === '23503') {
      throw new Error('Não é possível excluir uma categoria com transações vinculadas.')
    }
    if (error) throw error
    await fetchAll()
  }

  return { categories, loading, error, createCategory, updateCategory, deleteCategory }
}
