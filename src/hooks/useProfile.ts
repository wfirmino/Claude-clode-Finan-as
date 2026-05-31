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

    setProfile({
      id: user.id,
      // tabela tem prioridade; auth metadata como fallback
      name: data?.name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      birth_date: data?.birth_date ?? null,
      whatsapp: data?.whatsapp ?? null,
      avatar_url: data?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
    })
    setLoading(false)
  }, [])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  async function updateProfile(values: Partial<Omit<Profile, 'id'>>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    // 1. Salva sempre em auth metadata (nunca falha)
    const meta: Record<string, unknown> = {}
    if ('name' in values) meta.full_name = values.name
    if ('avatar_url' in values) meta.avatar_url = values.avatar_url
    if (Object.keys(meta).length > 0) {
      await supabase.auth.updateUser({ data: meta })
    }

    // 2. Tenta salvar na tabela profiles (pode falhar se colunas ainda não existem)
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...values })

    if (error) {
      // Se o erro for de coluna ausente, não bloqueia (já foi salvo no metadata)
      const isSchemaError =
        error.message?.toLowerCase().includes('column') ||
        error.message?.toLowerCase().includes('schema') ||
        error.code === 'PGRST204' ||
        error.code === '42703'
      if (!isSchemaError) throw error
      console.warn('updateProfile: coluna ausente na tabela, dado salvo só no metadata:', error.message)
    }

    await fetchProfile()
  }

  return { profile, loading, updateProfile, refetch: fetchProfile }
}
