import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface Installment {
  id: string
  user_id: string
  name: string
  original_amount: number | null
  interest_amount: number | null
  total_amount: number
  total_installments: number
  installment_amount: number
  first_payment_date: string
  paid_installments: number
  category: string | null
  notes: string | null
  created_at: string
}

export type InstallmentInput = Omit<Installment, 'id' | 'user_id' | 'created_at'>

export function getNextDueDate(inst: Installment): Date {
  const base = new Date(inst.first_payment_date + 'T12:00:00')
  return new Date(base.getFullYear(), base.getMonth() + inst.paid_installments, base.getDate())
}

export function getStatus(inst: Installment): 'quitado' | 'vencido' | 'em_dia' {
  if (inst.paid_installments >= inst.total_installments) return 'quitado'
  const next = getNextDueDate(inst)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return next < today ? 'vencido' : 'em_dia'
}

export function useInstallments() {
  const [installments, setInstallments] = useState<Installment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('installments')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) { setError(error.message); setLoading(false); return }
    setInstallments(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function createInstallment(values: InstallmentInput) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('Não autenticado')
    const { error } = await supabase.from('installments').insert({ ...values, user_id: session.user.id })
    if (error) throw error
    await fetchAll()
  }

  async function updateInstallment(id: string, values: Partial<InstallmentInput>) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('Não autenticado')
    const { error } = await supabase.from('installments').update(values).eq('id', id).eq('user_id', session.user.id)
    if (error) throw error
    await fetchAll()
  }

  async function deleteInstallment(id: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('Não autenticado')
    const { error } = await supabase.from('installments').delete().eq('id', id).eq('user_id', session.user.id)
    if (error) throw error
    await fetchAll()
  }

  async function payNext(id: string, currentPaid: number) {
    await updateInstallment(id, { paid_installments: currentPaid + 1 })
  }

  return { installments, loading, error, createInstallment, updateInstallment, deleteInstallment, payNext }
}
