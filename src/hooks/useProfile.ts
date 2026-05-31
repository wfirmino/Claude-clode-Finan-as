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
      .select('id, name, birth_date, whatsapp, avatar_url')
      .eq('id', user.id)
      .maybeSingle()

    // Avatar: tabela profiles > localStorage > null
    const localAvatar = localStorage.getItem(`avatar_${user.id}`)

    setProfile({
      id: user.id,
      name: data?.name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      birth_date: data?.birth_date ?? null,
      whatsapp: data?.whatsapp ?? null,
      avatar_url: data?.avatar_url ?? localAvatar ?? null,
    })
    setLoading(false)
  }, [])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  async function updateProfile(values: Partial<Omit<Profile, 'id'>>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    // Avatar: salva em localStorage IMEDIATAMENTE (garante exibição mesmo sem coluna no DB)
    if ('avatar_url' in values && values.avatar_url) {
      localStorage.setItem(`avatar_${user.id}`, values.avatar_url as string)
    }

    // name → auth metadata (sempre funciona)
    if ('name' in values) {
      await supabase.auth.updateUser({ data: { full_name: values.name } })
    }

    // Todos os campos → tabela profiles (ignora erro de coluna ausente)
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...values })

    if (error) {
      const isSchemaError =
        error.message?.toLowerCase().includes('column') ||
        error.message?.toLowerCase().includes('schema') ||
        error.code === 'PGRST204' ||
        error.code === '42703'
      if (!isSchemaError) throw error
    }

    await fetchProfile()
  }

  return { profile, loading, updateProfile, refetch: fetchProfile }
}
