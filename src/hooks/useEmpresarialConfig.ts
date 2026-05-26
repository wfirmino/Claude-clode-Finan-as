import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { EmpresarialConfig } from '../types'

export function useEmpresarialConfig() {
  const [prolabore, setProlaboreState] = useState(0)
  const [loading, setLoading] = useState(true)

  const currentMes = new Date().toISOString().slice(0, 7)

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { setLoading(false); return }

    const { data } = await supabase
      .from('empresarial_config')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('mes', currentMes)
      .single()

    setProlaboreState((data as EmpresarialConfig | null)?.prolabore ?? 0)
    setLoading(false)
  }, [currentMes])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  async function saveProlabore(valor: number, mes: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('Não autenticado')
    const { error } = await supabase
      .from('empresarial_config')
      .upsert({ user_id: session.user.id, mes, prolabore: valor })
    if (error) throw error
    if (mes === currentMes) setProlaboreState(valor)
  }

  return { prolabore, saveProlabore, loading }
}
