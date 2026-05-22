# Responsivo Mobile — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar o app usável em mobile com menu de abas deslizável no topo, cards de transação e bottom sheet de detalhes — sem alterar nada no layout desktop (>= 768px).

**Architecture:** Breakpoint exclusivo `md` (768px). Sidebar e table existentes ficam com `hidden md:flex` / `hidden md:block`. Dois novos componentes: `TopNav` (tabs móveis) e `TransactionSheet` (bottom sheet). Todos os outros ajustes são adição de classes responsivas Tailwind.

**Tech Stack:** React 19, Tailwind CSS 3, React Router DOM 7, Vitest + Testing Library

---

## File Map

| Ação | Arquivo |
|---|---|
| CREATE | `src/components/TopNav.tsx` |
| CREATE | `src/components/TransactionSheet.tsx` |
| CREATE | `tests/components/TopNav.test.tsx` |
| CREATE | `tests/components/TransactionSheet.test.tsx` |
| MODIFY | `src/index.css` — adicionar `.scrollbar-hide` |
| MODIFY | `src/components/Layout.tsx` — sidebar `hidden md:flex`, TopNav mobile |
| MODIFY | `src/pages/Dashboard.tsx` — grids responsivos |
| MODIFY | `src/pages/Transactions.tsx` — card view mobile + TransactionSheet |
| MODIFY | `src/pages/Installments.tsx` — card view mobile |
| MODIFY | `src/pages/Goals.tsx` — padding/grid mobile |
| MODIFY | `src/pages/Categories.tsx` — padding/grid mobile |
| MODIFY | `src/pages/Reports.tsx` — padding/grid mobile |

---

## Task 1: Utility `.scrollbar-hide` no CSS

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Adicionar utility ao final de `src/index.css`**

```css
@layer utilities {
  .scrollbar-hide {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

- [ ] **Step 2: Verificar que o build não quebra**

```bash
npm run build
```
Expected: `✓ built in ...`

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: add scrollbar-hide utility class"
```

---

## Task 2: Componente `TopNav`

**Files:**
- Create: `src/components/TopNav.tsx`
- Create: `tests/components/TopNav.test.tsx`

- [ ] **Step 1: Escrever o teste falhando**

```tsx
// tests/components/TopNav.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import TopNav from '../../src/components/TopNav'

describe('TopNav', () => {
  it('renderiza todas as abas de navegação', () => {
    render(<MemoryRouter><TopNav /></MemoryRouter>)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Transações')).toBeInTheDocument()
    expect(screen.getByText('Parcelamentos')).toBeInTheDocument()
    expect(screen.getByText('Metas')).toBeInTheDocument()
    expect(screen.getByText('Relatórios')).toBeInTheDocument()
    expect(screen.getByText('Categorias')).toBeInTheDocument()
  })

  it('tem aria-label para acessibilidade', () => {
    render(<MemoryRouter><TopNav /></MemoryRouter>)
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar o teste para ver falhar**

```bash
npm test -- tests/components/TopNav.test.tsx
```
Expected: FAIL — `Cannot find module '../../src/components/TopNav'`

- [ ] **Step 3: Implementar `TopNav`**

```tsx
// src/components/TopNav.tsx
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/transactions', label: 'Transações', end: false },
  { to: '/installments', label: 'Parcelamentos', end: false },
  { to: '/goals', label: 'Metas', end: false },
  { to: '/reports', label: 'Relatórios', end: false },
  { to: '/categories', label: 'Categorias', end: false },
]

export default function TopNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="flex overflow-x-auto gap-2 px-4 py-3 bg-white scrollbar-hide"
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
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 4: Rodar o teste para ver passar**

```bash
npm test -- tests/components/TopNav.test.tsx
```
Expected: PASS (2 testes)

- [ ] **Step 5: Commit**

```bash
git add src/components/TopNav.tsx tests/components/TopNav.test.tsx
git commit -m "feat: add TopNav scrollable tab component for mobile"
```

---

## Task 3: Componente `TransactionSheet`

**Files:**
- Create: `src/components/TransactionSheet.tsx`
- Create: `tests/components/TransactionSheet.test.tsx`

- [ ] **Step 1: Escrever o teste falhando**

```tsx
// tests/components/TransactionSheet.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import TransactionSheet from '../../src/components/TransactionSheet'
import type { Transaction } from '../../src/types'

const mockTx: Transaction = {
  id: 't1',
  user_id: 'u1',
  title: 'Salário',
  amount: 5000,
  type: 'income',
  date: '2026-05-01',
  notes: null,
  category_id: 'c1',
  created_at: '',
  categories: { id: 'c1', user_id: 'u1', name: 'Receita', type: 'income', color: '#22c55e', created_at: '' },
}

describe('TransactionSheet', () => {
  it('não renderiza nada quando transaction é null', () => {
    const { container } = render(
      <TransactionSheet transaction={null} onClose={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('exibe título, valor e categoria da transação', () => {
    render(
      <TransactionSheet transaction={mockTx} onClose={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />
    )
    expect(screen.getByText('Salário')).toBeInTheDocument()
    expect(screen.getByText('Receita')).toBeInTheDocument()
  })

  it('chama onClose ao clicar no overlay', () => {
    const onClose = vi.fn()
    render(
      <TransactionSheet transaction={mockTx} onClose={onClose} onEdit={vi.fn()} onDelete={vi.fn()} />
    )
    fireEvent.click(screen.getByRole('dialog').previousElementSibling!)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('chama onDelete e onClose ao clicar em Excluir', () => {
    const onDelete = vi.fn()
    const onClose = vi.fn()
    render(
      <TransactionSheet transaction={mockTx} onClose={onClose} onEdit={vi.fn()} onDelete={onDelete} />
    )
    fireEvent.click(screen.getByText(/Excluir/))
    expect(onDelete).toHaveBeenCalledWith('t1')
    expect(onClose).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Rodar o teste para ver falhar**

```bash
npm test -- tests/components/TransactionSheet.test.tsx
```
Expected: FAIL — `Cannot find module '../../src/components/TransactionSheet'`

- [ ] **Step 3: Implementar `TransactionSheet`**

```tsx
// src/components/TransactionSheet.tsx
import type { Transaction } from '../types'
import { formatCurrency, formatDate } from '../utils/formatters'

interface Props {
  transaction: Transaction | null
  onClose: () => void
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => void
}

export default function TransactionSheet({ transaction, onClose, onEdit, onDelete }: Props) {
  if (!transaction) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalhes da transação"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl"
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <span className="text-sm font-bold text-gray-900">Detalhes da Transação</span>
          <div className="flex gap-4">
            <button
              onClick={() => { onEdit(transaction); onClose() }}
              className="text-sm font-semibold text-indigo-600"
            >
              ✏️ Editar
            </button>
            <button
              onClick={() => { onDelete(transaction.id); onClose() }}
              className="text-sm font-semibold text-red-500"
            >
              🗑 Excluir
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-2xl">
            {transaction.type === 'income' ? '💰' : '💸'}
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">{transaction.title}</p>
            <p className={`text-2xl font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
              {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
            </p>
          </div>
        </div>
        <div className="divide-y divide-gray-50 pb-8">
          <div className="flex justify-between items-center px-5 py-3 text-sm">
            <span className="text-gray-400">📅 Data</span>
            <span className="font-medium text-gray-800">{formatDate(transaction.date)}</span>
          </div>
          <div className="flex justify-between items-center px-5 py-3 text-sm">
            <span className="text-gray-400">🏷 Categoria</span>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${transaction.type === 'income' ? 'bg-green-50 text-green-700' : 'bg-indigo-50 text-indigo-700'}`}>
              {transaction.categories?.name ?? '—'}
            </span>
          </div>
          <div className="flex justify-between items-center px-5 py-3 text-sm">
            <span className="text-gray-400">📝 Tipo</span>
            <span className="font-medium text-gray-800">
              {transaction.type === 'income' ? 'Receita' : 'Despesa'}
            </span>
          </div>
          {transaction.notes && (
            <div className="flex justify-between items-center px-5 py-3 text-sm">
              <span className="text-gray-400">📌 Observação</span>
              <span className="font-medium text-gray-800 max-w-[200px] text-right">{transaction.notes}</span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 4: Rodar os testes para ver passar**

```bash
npm test -- tests/components/TransactionSheet.test.tsx
```
Expected: PASS (4 testes)

- [ ] **Step 5: Commit**

```bash
git add src/components/TransactionSheet.tsx tests/components/TransactionSheet.test.tsx
git commit -m "feat: add TransactionSheet bottom sheet component"
```

---

## Task 4: Atualizar `Layout.tsx`

**Files:**
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: Substituir o conteúdo de `src/components/Layout.tsx`**

```tsx
// src/components/Layout.tsx
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
    try { await signOut() } catch {}
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
```

- [ ] **Step 2: Rodar os testes existentes**

```bash
npm test
```
Expected: todos passam

- [ ] **Step 3: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat: show TopNav on mobile, keep sidebar on desktop"
```

---

## Task 5: Responsivo no `Dashboard.tsx`

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Tornar o grid de cards responsivo**

Localizar a linha:
```tsx
<div className="grid grid-cols-3 gap-4">
```
Substituir por:
```tsx
<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
```

- [ ] **Step 2: Fazer o terceiro card (Despesas) ocupar 2 colunas no mobile**

O array de cards é mapeado com `.map()`. Adicionar classe condicional ao terceiro item (índice 2):

```tsx
{[
  { label: 'Saldo atual', value: balance, color: balance >= 0 ? 'text-gray-900' : 'text-red-600' },
  { label: 'Receitas do mês', value: income, color: 'text-green-600' },
  { label: 'Despesas do mês', value: expense, color: 'text-red-600' },
].map((card, i) => (
  <div
    key={card.label}
    className={`bg-white rounded-xl border border-gray-200 p-5 ${i === 2 ? 'col-span-2 md:col-span-1' : ''}`}
  >
    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{card.label}</p>
    <p className={`text-2xl font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
  </div>
))}
```

- [ ] **Step 3: Tornar o grid de gráficos em coluna única no mobile**

Localizar:
```tsx
<div className="grid grid-cols-2 gap-6">
```
Substituir por:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
```

- [ ] **Step 4: Rodar os testes do Dashboard**

```bash
npm test -- tests/pages/Dashboard.test.tsx
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: responsive grid on Dashboard for mobile"
```

---

## Task 6: Card view mobile em `Transactions.tsx`

**Files:**
- Modify: `src/pages/Transactions.tsx`

- [ ] **Step 1: Importar `TransactionSheet` no topo do arquivo**

Adicionar após os imports existentes:
```tsx
import TransactionSheet from '../components/TransactionSheet'
```

- [ ] **Step 2: Adicionar estado para o sheet**

Dentro do componente `Transactions`, após a declaração dos estados existentes, adicionar:
```tsx
const [sheetTx, setSheetTx] = useState<Transaction | null>(null)
```

- [ ] **Step 3: Adicionar o card view mobile logo antes da tabela**

Localizar o bloco:
```tsx
{/* Transaction table */}
{loading ? (
```

Inserir **antes** desse bloco o card view mobile:
```tsx
{/* Mobile card list — hidden on desktop */}
{!loading && (
  <div className="md:hidden space-y-3 mb-4">
    {paginated.length === 0 && (
      <p className="text-sm text-gray-400 text-center py-8">Nenhuma transação encontrada</p>
    )}
    {paginated.map(t => (
      <button
        key={t.id}
        onClick={() => setSheetTx(t)}
        className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 space-y-2"
      >
        <div className="flex justify-between items-center text-xs text-gray-400">
          <span>{formatDate(t.date)}</span>
          <span>⋮</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-lg flex-shrink-0">
            {t.type === 'income' ? '💰' : '💸'}
          </div>
          <span className="text-sm font-semibold text-gray-900">{t.title}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.type === 'income' ? 'bg-green-50 text-green-700' : 'bg-indigo-50 text-indigo-700'}`}>
            {t.categories?.name ?? '—'}
          </span>
          <span className={`text-sm font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
          </span>
        </div>
      </button>
    ))}
    {totalPages > 1 && (
      <div className="flex items-center justify-between pt-2">
        <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-sm text-indigo-600 disabled:opacity-40">← Anterior</button>
        <span className="text-sm text-gray-500">{page + 1} / {totalPages}</span>
        <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="text-sm text-indigo-600 disabled:opacity-40">Próxima →</button>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 4: Esconder a tabela no mobile**

Localizar:
```tsx
{/* Transaction table */}
{loading ? (
  <p className="text-sm text-gray-400 py-4">Carregando...</p>
) : (
  <div className="rounded-xl border border-gray-200 overflow-hidden">
```

Substituir a div externa por:
```tsx
{/* Transaction table — desktop only */}
{loading ? (
  <p className="text-sm text-gray-400 py-4">Carregando...</p>
) : (
  <div className="hidden md:block rounded-xl border border-gray-200 overflow-hidden">
```

- [ ] **Step 5: Adicionar `TransactionSheet` no final do componente, antes do `Modal`**

Localizar `<Modal open={modal.open}` e inserir antes:
```tsx
<TransactionSheet
  transaction={sheetTx}
  onClose={() => setSheetTx(null)}
  onEdit={openEdit}
  onDelete={handleDelete}
/>
```

- [ ] **Step 6: Rodar os testes de Transactions**

```bash
npm test -- tests/pages/Transactions.test.tsx
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/pages/Transactions.tsx
git commit -m "feat: mobile card view and bottom sheet for transactions"
```

---

## Task 7: Card view mobile em `Installments.tsx`

**Files:**
- Modify: `src/pages/Installments.tsx`

- [ ] **Step 1: Localizar a tabela de parcelamentos**

No arquivo `src/pages/Installments.tsx`, localizar o elemento `<table` dentro do bloco de listagem de parcelas.

- [ ] **Step 2: Adicionar card view mobile antes da tabela**

Localizar o `<div` que envolve a tabela (tem `rounded-xl border border-gray-200 overflow-hidden`) e adicionar o card list antes dele, dentro de `{!loading && (`:

```tsx
{/* Mobile cards */}
{!loading && (
  <div className="md:hidden space-y-3 mb-4">
    {installments.length === 0 && (
      <p className="text-sm text-gray-400 text-center py-8">Nenhum parcelamento cadastrado.</p>
    )}
    {installments.map(inst => {
      const status = getStatus(inst)
      const nextDue = getNextDueDate(inst)
      return (
        <div key={inst.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-sm font-semibold text-gray-900">{inst.name}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[status]}`}>
              {STATUS_LABEL[status]}
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Parcela: <strong className="text-gray-800">{formatCurrency(inst.installment_amount)}</strong></span>
            <span>{inst.paid_installments}/{inst.total_installments} pagas</span>
          </div>
          {nextDue && (
            <div className="text-xs text-gray-400">Próximo vencimento: {nextDue}</div>
          )}
          <div className="flex gap-3 pt-1">
            {status !== 'quitado' && (
              <button
                onClick={() => payNext(inst.id)}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Marcar pago
              </button>
            )}
            <button
              onClick={() => openEdit(inst)}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Editar
            </button>
            <button
              onClick={() => setConfirmDelete(inst.id)}
              className="text-xs font-semibold text-red-500 hover:underline"
            >
              Excluir
            </button>
          </div>
          {confirmDelete === inst.id && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-gray-600">Confirmar exclusão?</span>
              <button onClick={() => handleDelete(inst.id)} className="text-xs font-medium text-red-600 hover:underline">Sim</button>
              <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-500 hover:underline">Não</button>
            </div>
          )}
        </div>
      )
    })}
  </div>
)}
```

- [ ] **Step 3: Esconder tabela no mobile**

Localizar o `<div className="rounded-xl border border-gray-200 overflow-hidden">` que envolve a `<table` de installments e adicionar `hidden md:block`:

```tsx
<div className="hidden md:block rounded-xl border border-gray-200 overflow-hidden">
```

- [ ] **Step 4: Rodar testes**

```bash
npm test
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Installments.tsx
git commit -m "feat: mobile card view for installments"
```

---

## Task 8: Ajustes responsivos em Goals, Categories e Reports

**Files:**
- Modify: `src/pages/Goals.tsx`
- Modify: `src/pages/Categories.tsx`
- Modify: `src/pages/Reports.tsx`

- [ ] **Step 1: `Goals.tsx` — tornar grid de cards responsivo**

Localizar qualquer `grid-cols-2` ou `grid-cols-3` e adicionar breakpoint `md:`:
- `grid-cols-2` → `grid-cols-1 md:grid-cols-2`
- `grid-cols-3` → `grid-cols-1 md:grid-cols-3`

Se não houver grid, apenas verificar que os elementos têm `w-full` para não transbordar em mobile.

- [ ] **Step 2: `Categories.tsx` — tornar grid de cards responsivo**

Mesma lógica: localizar `grid-cols-2` ou `grid-cols-3` e adicionar `md:` prefix.

- [ ] **Step 3: `Reports.tsx` — tornar gráficos e grids responsivos**

Localizar `grid-cols-2` e substituir por `grid-cols-1 md:grid-cols-2`.

- [ ] **Step 4: Rodar todos os testes**

```bash
npm test
```
Expected: todos passam

- [ ] **Step 5: Commit**

```bash
git add src/pages/Goals.tsx src/pages/Categories.tsx src/pages/Reports.tsx
git commit -m "feat: responsive layouts for Goals, Categories and Reports"
```

---

## Task 9: Build final e push

- [ ] **Step 1: Build de produção**

```bash
npm run build
```
Expected: `✓ built in ...` sem erros TypeScript

- [ ] **Step 2: Push para o GitHub**

```bash
git push origin main
```

- [ ] **Step 3: Redeploy no Coolify**

Acessar o painel do Coolify e clicar em **Redeploy**.
