import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Goal } from '../types'

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data, error } = await supabase.from('goals').select('*').order('deadline')
    if (error) { setError(error.message); setLoading(false); return }
    setGoals(data)
    setLoading(false)
  }

  async function createGoal(values: Pick<Goal, 'title' | 'target' | 'current' | 'deadline'>) {
    const { error } = await supabase.from('goals').insert(values)
    if (error) throw error
    await fetchAll()
  }

  async function updateGoal(id: string, values: Pick<Goal, 'title' | 'target' | 'current' | 'deadline'>) {
    const { error } = await supabase.from('goals').update(values).eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  async function deleteGoal(id: string) {
    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  return { goals, loading, error, createGoal, updateGoal, deleteGoal }
}
