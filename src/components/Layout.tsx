import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import TopNav from './TopNav'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/transactions', label: 'Transações', end: false },
  { to: '/installments', label: 'Parcelamentos', end: false },
  { to: '/categories', label: 'Categorias', end: false },
  { to: '/goals', label: 'Metas', end: false },
  { to: '/reports', label: 'Relatórios', end: false },
]

export default function Layout() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    try { await signOut() } catch (err) { console.error('Sign out error:', err) }
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
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
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-base font-bold text-indigo-600">FinanceApp</span>
            <button
              onClick={handleSignOut}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Sair
            </button>
          </div>
          <TopNav />
        </div>
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
