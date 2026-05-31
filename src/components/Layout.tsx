import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import TopNav from './TopNav'
import Drawer from './Drawer'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/transactions', label: 'Transações', end: false },
  { to: '/cartao', label: '💳 Cartão', end: false },
  { to: '/installments', label: 'Parcelamentos', end: false },
  { to: '/categories', label: 'Categorias', end: false },
  { to: '/goals', label: 'Metas', end: false },
  { to: '/reports', label: 'Relatórios', end: false },
]

export default function Layout() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  useTheme() // Garante classe dark/light no <html> ao montar

  async function handleSignOut() {
    try { await signOut() } catch (err) { console.error('Sign out error:', err) }
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex w-56 shrink-0 bg-white border-r border-gray-200 flex-col">
        <div className="px-6 py-5 border-b border-gray-200">
          <span className="text-lg font-bold text-indigo-600">FinanceApp</span>
        </div>
        <nav aria-label="Navegação principal" className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors text-left"
          >
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header + TopNav — mobile only */}
        <div className="md:hidden bg-white border-b border-gray-200">
          <div className="flex items-center px-4 py-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-1 -ml-1 text-gray-600 hover:text-gray-900"
              aria-label="Abrir menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="flex-1 text-center text-base font-bold text-indigo-600">FinanceApp</span>
          </div>
          <TopNav />
        </div>
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
