import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Goal } from '../types'

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.from('goals').select('*').order('deadline')
    if (error) { setError(error.message); setLoading(false); return }
    setGoals(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function createGoal(values: Pick<Goal, 'title' | 'target' | 'current' | 'deadline'>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')
    const { error } = await supabase.from('goals').insert({ ...values, user_id: user.id })
    if (error) throw error
    await fetchAll()
  }

  async function updateGoal(id: string, values: Pick<Goal, 'title' | 'target' | 'current' | 'deadline'>) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('goals').update(values).eq('id', id).eq('user_id', user?.id ?? '')
    if (error) throw error
    await fetchAll()
  }

  async function deleteGoal(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('goals').delete().eq('id', id).eq('user_id', user?.id ?? '')
    if (error) throw error
    await fetchAll()
  }

  return { goals, loading, error, createGoal, updateGoal, deleteGoal }
}
