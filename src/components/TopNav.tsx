import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/transactions', label: 'Transações', end: false },
  { to: '/cartao', label: '💳 Cartão', end: false },
  { to: '/installments', label: 'Parcelamentos', end: false },
  { to: '/goals', label: 'Metas', end: false },
  { to: '/reports', label: 'Relatórios', end: false },
  { to: '/categories', label: 'Categorias', end: false },
]

export default function TopNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="flex overflow-x-auto gap-2 px-4 pb-3 bg-white dark:bg-[#111] scrollbar-hide"
    >
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex-shrink-0 text-sm font-semibold px-4 py-1.5 rounded-full transition-colors ${
              isActive
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#333]'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
