import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Card } from '../types'

type CardInput = Pick<Card, 'name' | 'due_day' | 'color'>

export function useCards() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) { setError(error.message); setLoading(false); return }
    setCards(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function createCard(values: CardInput) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')
    const { error } = await supabase.from('cards').insert({ ...values, user_id: user.id })
    if (error) throw error
    await fetchAll()
  }

  async function updateCard(id: string, values: CardInput) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')
    const { error } = await supabase.from('cards').update(values).eq('id', id).eq('user_id', user.id)
    if (error) throw error
    await fetchAll()
  }

  async function deleteCard(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')
    const { error } = await supabase.from('cards').delete().eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  return { cards, loading, error, createCard, updateCard, deleteCard, refetch: fetchAll }
}
