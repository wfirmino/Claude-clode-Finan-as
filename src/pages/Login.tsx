import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

type Mode = 'login' | 'signup' | 'reset'

export default function Login() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setInfo('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else if (mode === 'signup') {
        await signUp(email, password)
        setInfo('Conta criada! Verifique seu e-mail para confirmar o cadastro.')
      } else {
        await resetPassword(email)
        setInfo('E-mail de redefinição enviado. Verifique sua caixa de entrada.')
      }
    } catch {
      if (mode === 'login') setError('E-mail ou senha incorretos.')
      else if (mode === 'signup') setError('Não foi possível criar a conta.')
      else setError('Não foi possível enviar o e-mail.')
    } finally {
      setLoading(false)
    }
  }

  const title = { login: 'Entre na sua conta', signup: 'Criar conta', reset: 'Redefinir senha' }[mode]
  const submitLabel = { login: 'Entrar', signup: 'Criar conta', reset: 'Enviar' }[mode]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">FinanceApp</h1>
        <p className="text-sm text-gray-500 mb-6">{title}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                id="senha"
                type="password"
                required
                minLength={mode === 'signup' ? 6 : undefined}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
          {info && <p className="text-sm text-green-600">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Aguarde...' : submitLabel}
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-1">
          {mode !== 'login' && (
            <button onClick={() => switchMode('login')} className="text-sm text-indigo-600 hover:underline text-left">
              ← Voltar para o login
            </button>
          )}
          {mode === 'login' && (
            <>
              <button onClick={() => switchMode('signup')} className="text-sm text-indigo-600 hover:underline text-left">
                Criar uma conta
              </button>
              <button onClick={() => switchMode('reset')} className="text-sm text-indigo-600 hover:underline text-left">
                Esqueci minha senha
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
