const KNOWN_ERRORS: Record<string, string> = {
  '23505': 'Já existe um registro com esses dados.',
  '23503': 'Não é possível excluir: este registro está em uso.',
  '23514': 'Valor inválido: verifique os campos da transação.',
  'PGRST116': 'Nenhum registro encontrado.',
}

export function getErrorMessage(err: unknown): string {
  const code = (err as Record<string, unknown>)?.code
  if (typeof code === 'string' && code in KNOWN_ERRORS) return KNOWN_ERRORS[code]
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err && typeof (err as Record<string, unknown>).message === 'string') {
    return (err as { message: string }).message
  }
  return 'Erro inesperado.'
}

export function isCheckConstraintError(err: unknown, constraintName?: string): boolean {
  const code = (err as Record<string, unknown>)?.code
  if (code !== '23514') return false
  if (!constraintName) return true
  const msg = String((err as Record<string, unknown>)?.message ?? '')
  return msg.includes(constraintName)
}
