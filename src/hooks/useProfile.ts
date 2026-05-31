import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface Profile {
  id: string
  name: string | null       // auth user_metadata
  birth_date: string | null // profiles table
  whatsapp: string | null   // profiles table
  avatar_url: string | null // auth user_metadata
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
      .select('id, birth_date, whatsapp')
      .eq('id', user.id)
      .maybeSingle()

    setProfile({
      id: user.id,
      name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      birth_date: data?.birth_date ?? null,
      whatsapp: data?.whatsapp ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
    })
    setLoading(false)
  }, [])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  async function updateProfile(values: Partial<Omit<Profile, 'id'>>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    // name e avatar_url → auth user metadata (sem coluna na tabela)
    const meta: Record<string, unknown> = {}
    if ('name' in values) meta.full_name = values.name
    if ('avatar_url' in values) meta.avatar_url = values.avatar_url
    if (Object.keys(meta).length > 0) {
      const { error } = await supabase.auth.updateUser({ data: meta })
      if (error) throw error
    }

    // birth_date e whatsapp → tabela profiles
    const dbFields: Record<string, unknown> = {}
    if ('birth_date' in values) dbFields.birth_date = values.birth_date || null
    if ('whatsapp' in values) dbFields.whatsapp = values.whatsapp || null
    if (Object.keys(dbFields).length > 0) {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...dbFields })
      if (error) throw error
    }

    await fetchProfile()
  }

  return { profile, loading, updateProfile, refetch: fetchProfile }
}
