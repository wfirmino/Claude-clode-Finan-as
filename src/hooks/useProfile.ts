import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface Profile {
  id: string
  name: string | null
  birth_date: string | null
  whatsapp: string | null
  avatar_url: string | null
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    setProfile(data ?? { id: user.id, name: null, birth_date: null, whatsapp: null, avatar_url: null })
    setLoading(false)
  }, [])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  async function updateProfile(values: Partial<Omit<Profile, 'id'>>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...values, updated_at: new Date().toISOString() })
    if (error) throw error
    await fetchProfile()
  }

  return { profile, loading, updateProfile, refetch: fetchProfile }
}
