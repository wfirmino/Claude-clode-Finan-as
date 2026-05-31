import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Installments from './pages/Installments'
import Categories from './pages/Categories'
import Goals from './pages/Goals'
import Reports from './pages/Reports'
import Cartao from './pages/Cartao'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400 text-sm">
        Carregando...
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute user={user} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/cartao" element={<Cartao />} />
          <Route path="/installments" element={<Installments />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/reports" element={<Reports />} />
        </Route>
      </Route>
      <Route path="*" element={
        <div className="flex flex-col items-center justify-center h-screen text-center">
          <p className="text-4xl font-bold text-gray-300 mb-2">404</p>
          <p className="text-gray-500 mb-4">Página não encontrada</p>
          <a href="/" className="text-indigo-600 text-sm hover:underline">Voltar ao início</a>
        </div>
      } />
    </Routes>
  )
}
