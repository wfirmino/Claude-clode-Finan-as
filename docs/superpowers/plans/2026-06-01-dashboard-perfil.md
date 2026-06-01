# Dashboard com Abas por Perfil — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar barra de abas (Geral · Pessoal · Empresarial · Kommo) ao Dashboard, exibindo cards mensais filtrados por perfil em cada aba.

**Architecture:** Todos os dados já estão carregados via `useTransactions({ noLimit: true })`; a filtragem por perfil acontece em memória com `useMemo`. Duas funções puras novas em `calculations.ts` encapsulam os cálculos por perfil. O Dashboard rastreia `activeTab` em estado local e renderiza conteúdo condicionalmente. O pró-labore do Empresarial vem do hook `useEmpresarialConfig` já existente.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest, @testing-library/react

---

## File Map

| Arquivo | Ação |
|---------|------|
| `src/utils/calculations.ts` | Adicionar `calculatePerfilMonthTotals` e `calculateKommoMonthTotals` |
| `src/pages/Dashboard.tsx` | Adicionar estado de aba, barra de abas e conteúdo por aba |
| `tests/utils/calculations.test.ts` | Adicionar testes para as duas novas funções |
| `tests/pages/Dashboard.test.tsx` | Adicionar mock de `useEmpresarialConfig` e testes de navegação por abas |

---

## Task 1: Funções de cálculo por perfil

**Files:**
- Modify: `src/utils/calculations.ts`
- Modify: `tests/utils/calculations.test.ts`

- [ ] **Step 1: Adicionar imports dos novos nomes no arquivo de teste**

Em `tests/utils/calculations.test.ts`, substituir o import na linha 2:

```ts
import {
  calculateBalance,
  calculateCurrentMonthTotals,
  calculateMonthlyTotals,
  calculateCategoryTotals,
  calculateGoalProgress,
  isGoalAtRisk,
  calculatePerfilMonthTotals,
  calculateKommoMonthTotals,
} from '../../src/utils/calculations'
```

- [ ] **Step 2: Escrever os testes que vão falhar**

Adicionar ao final de `tests/utils/calculations.test.ts`:

```ts
const txPessoal: Transaction[] = [
  { id: 'p1', user_id: 'u1', category_id: null, title: 'Salário pessoal', amount: 3000, type: 'income', date: `${YEAR}-${MONTH}-01`, notes: null, created_at: '', perfil: 'pessoal' },
  { id: 'p2', user_id: 'u1', category_id: null, title: 'Supermercado', amount: 500, type: 'expense', date: `${YEAR}-${MONTH}-05`, notes: null, created_at: '', perfil: 'pessoal' },
]
const txEmpresarial: Transaction[] = [
  { id: 'e1', user_id: 'u1', category_id: null, title: 'Receita empresa', amount: 10000, type: 'income', date: `${YEAR}-${MONTH}-01`, notes: null, created_at: '', perfil: 'empresarial' },
  { id: 'e2', user_id: 'u1', category_id: null, title: 'Despesa empresa', amount: 2000, type: 'expense', date: `${YEAR}-${MONTH}-10`, notes: null, created_at: '', perfil: 'empresarial' },
]
const txKommo: Transaction[] = [
  { id: 'k1', user_id: 'u1', category_id: null, title: 'Assinatura Kommo', amount: 5000, type: 'income', date: `${YEAR}-${MONTH}-01`, notes: null, created_at: '', perfil: 'kommo', valor_pago_kommo: 1500, valor_liquido_recebido: 3500 },
]
const allPerfilTx = [...txPessoal, ...txEmpresarial, ...txKommo]

describe('calculatePerfilMonthTotals', () => {
  it('retorna income, expense e balance para pessoal', () => {
    const r = calculatePerfilMonthTotals(allPerfilTx, 'pessoal')
    expect(r.income).toBe(3000)
    expect(r.expense).toBe(500)
    expect(r.balance).toBe(2500)
  })
  it('retorna zeros quando não há transações para o perfil', () => {
    const r = calculatePerfilMonthTotals(allPerfilTx, 'cartao')
    expect(r.income).toBe(0)
    expect(r.expense).toBe(0)
    expect(r.balance).toBe(0)
  })
  it('não inclui transações de outros perfis', () => {
    const r = calculatePerfilMonthTotals(allPerfilTx, 'empresarial')
    expect(r.income).toBe(10000)
    expect(r.expense).toBe(2000)
    expect(r.balance).toBe(8000)
  })
})

describe('calculateKommoMonthTotals', () => {
  it('retorna income, valorPagoKommo e valorLiquidoRecebido', () => {
    const r = calculateKommoMonthTotals(allPerfilTx)
    expect(r.income).toBe(5000)
    expect(r.valorPagoKommo).toBe(1500)
    expect(r.valorLiquidoRecebido).toBe(3500)
  })
  it('retorna zeros para array vazio', () => {
    const r = calculateKommoMonthTotals([])
    expect(r.income).toBe(0)
    expect(r.valorPagoKommo).toBe(0)
    expect(r.valorLiquidoRecebido).toBe(0)
  })
  it('trata transações sem valor_pago_kommo como zero', () => {
    const txSemCampos: Transaction[] = [
      { id: 'k2', user_id: 'u1', category_id: null, title: 'Kommo sem campos', amount: 1000, type: 'income', date: `${YEAR}-${MONTH}-01`, notes: null, created_at: '', perfil: 'kommo' },
    ]
    const r = calculateKommoMonthTotals(txSemCampos)
    expect(r.income).toBe(1000)
    expect(r.valorPagoKommo).toBe(0)
    expect(r.valorLiquidoRecebido).toBe(0)
  })
})
```

- [ ] **Step 3: Confirmar que os testes falham**

```
npx vitest run tests/utils/calculations.test.ts
```

Esperado: FAIL — `calculatePerfilMonthTotals is not a function`.

- [ ] **Step 4: Adicionar `Perfil` ao import em `src/utils/calculations.ts`**

Substituir a linha 1 de `src/utils/calculations.ts`:

```ts
import type { Transaction, Goal, MonthlyTotals, CategoryTotal } from '../types'
```

por:

```ts
import type { Transaction, Goal, MonthlyTotals, CategoryTotal, Perfil } from '../types'
```

- [ ] **Step 5: Adicionar as duas funções ao final de `src/utils/calculations.ts`**

```ts
export function calculatePerfilMonthTotals(
  transactions: Transaction[],
  perfil: Perfil,
): { income: number; expense: number; balance: number } {
  const filtered = filterCurrentMonth(transactions).filter(t => t.perfil === perfil)
  const income = filtered.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0)
  const expense = filtered.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0)
  return { income, expense, balance: income - expense }
}

export function calculateKommoMonthTotals(
  transactions: Transaction[],
): { income: number; valorPagoKommo: number; valorLiquidoRecebido: number } {
  const filtered = filterCurrentMonth(transactions).filter(t => t.perfil === 'kommo')
  const income = filtered.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0)
  const valorPagoKommo = filtered.reduce((a, t) => a + (t.valor_pago_kommo ?? 0), 0)
  const valorLiquidoRecebido = filtered.reduce((a, t) => a + (t.valor_liquido_recebido ?? 0), 0)
  return { income, valorPagoKommo, valorLiquidoRecebido }
}
```

- [ ] **Step 6: Confirmar que os testes passam**

```
npx vitest run tests/utils/calculations.test.ts
```

Esperado: PASS — todos os describes, incluindo os novos.

- [ ] **Step 7: Commit**

```bash
git add src/utils/calculations.ts tests/utils/calculations.test.ts
git commit -m "feat: add calculatePerfilMonthTotals and calculateKommoMonthTotals"
```

---

## Task 2: Barra de abas + aba Pessoal no Dashboard

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Modify: `tests/pages/Dashboard.test.tsx`

- [ ] **Step 1: Escrever testes que vão falhar**

Adicionar ao final de `tests/pages/Dashboard.test.tsx`, antes do fechamento do arquivo:

```ts
import { fireEvent } from '@testing-library/react'

const currentMonthPad = new Date().toISOString().split('T')[0].slice(0, 7)

const mockTransactionsComPerfil = [
  { id: 't1', user_id: 'u1', category_id: null, title: 'Salário pessoal', amount: 3000, type: 'income', date: `${currentMonthPad}-01`, notes: null, created_at: '', categories: null, perfil: 'pessoal' },
  { id: 't2', user_id: 'u1', category_id: null, title: 'Supermercado', amount: 500, type: 'expense', date: `${currentMonthPad}-05`, notes: null, created_at: '', categories: null, perfil: 'pessoal' },
  { id: 't3', user_id: 'u1', category_id: null, title: 'Receita empresa', amount: 8000, type: 'income', date: `${currentMonthPad}-01`, notes: null, created_at: '', categories: null, perfil: 'empresarial' },
  { id: 't4', user_id: 'u1', category_id: null, title: 'Kommo cliente', amount: 5000, type: 'income', date: `${currentMonthPad}-01`, notes: null, created_at: '', categories: null, perfil: 'kommo', valor_pago_kommo: 1200, valor_liquido_recebido: 3800 },
]

describe('Dashboard tabs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renderiza as quatro abas', async () => {
    mockFrom(mockTransactionsComPerfil)
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /geral/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /pessoal/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /empresarial/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /kommo/i })).toBeInTheDocument()
    })
  })

  it('abre na aba Geral por padrão', async () => {
    mockFrom(mockTransactionsComPerfil)
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText(/saldo atual/i)).toBeInTheDocument()
    })
  })

  it('aba Pessoal exibe receitas e despesas filtradas por pessoal', async () => {
    mockFrom(mockTransactionsComPerfil)
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    await waitFor(() => screen.getByRole('button', { name: /pessoal/i }))
    fireEvent.click(screen.getByRole('button', { name: /pessoal/i }))
    await waitFor(() => {
      expect(screen.getByText(/receitas do mês/i)).toBeInTheDocument()
      expect(screen.getByText(/despesas do mês/i)).toBeInTheDocument()
      expect(screen.getByText(/saldo do mês/i)).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Confirmar que os testes falham**

```
npx vitest run tests/pages/Dashboard.test.tsx
```

Esperado: FAIL — testes de tabs não encontram botões de navegação.

- [ ] **Step 3: Atualizar `src/pages/Dashboard.tsx` — imports e estado**

Substituir a linha 1 do arquivo:

```ts
import { useMemo } from 'react'
```

por:

```ts
import { useMemo, useState } from 'react'
```

Adicionar ao final do bloco de imports de `'../utils/calculations'`:

```ts
import {
  calculateBalance,
  calculateCurrentMonthTotals,
  calculateMonthlyTotals,
  calculateCategoryTotals,
  filterCurrentMonth,
  calculatePerfilMonthTotals,
} from '../utils/calculations'
```

Após a linha `const { transactions, totalCount, loading, error } = useTransactions({ noLimit: true })`, adicionar:

```ts
const [activeTab, setActiveTab] = useState<'geral' | 'pessoal' | 'empresarial' | 'kommo'>('geral')
```

- [ ] **Step 4: Adicionar useMemo para aba Pessoal**

Após o bloco dos useMemos existentes (após `const recent = ...`), adicionar:

```ts
const pessoal = useMemo(() => calculatePerfilMonthTotals(transactions, 'pessoal'), [transactions])
```

- [ ] **Step 5: Adicionar a barra de abas ao JSX**

Substituir a linha do `<h2>Dashboard</h2>`:

```tsx
<h2 className="text-xl font-semibold text-gray-900 dark:text-white">Dashboard</h2>
```

por:

```tsx
<div className="flex items-center justify-between">
  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Dashboard</h2>
</div>

<div className="flex border-b border-gray-200 dark:border-white/10">
  {(['geral', 'pessoal', 'empresarial', 'kommo'] as const).map(tab => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
        activeTab === tab
          ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
      }`}
    >
      {tab.charAt(0).toUpperCase() + tab.slice(1)}
    </button>
  ))}
</div>
```

- [ ] **Step 6: Adicionar conteúdo condicional da aba Pessoal**

Envolver o conteúdo atual do Dashboard (a partir dos cards de resumo até o final) dentro de:

```tsx
{activeTab === 'geral' && (
  <>
    {/* todo o JSX atual — summary cards, charts, recent transactions */}
  </>
)}

{activeTab === 'pessoal' && (
  <div className="grid grid-cols-2 gap-4">
    {[
      { label: 'Receitas do mês', value: pessoal.income, color: 'text-green-600 dark:text-green-400' },
      { label: 'Despesas do mês', value: pessoal.expense, color: 'text-red-600 dark:text-red-400' },
      { label: 'Saldo do mês', value: pessoal.balance, color: pessoal.balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400' },
    ].map((card, i) => (
      <div key={card.label} className={`rounded-xl border border-gray-200 dark:border-white/10 p-5 flex flex-col items-center justify-center text-center ${i === 2 ? 'col-span-2' : ''}`}>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{card.label}</p>
        <p className={`text-2xl font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 7: Confirmar que os testes passam**

```
npx vitest run tests/pages/Dashboard.test.tsx
```

Esperado: PASS — todos os testes existentes + os novos de tabs.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Dashboard.tsx tests/pages/Dashboard.test.tsx
git commit -m "feat: add tab bar and Pessoal tab to Dashboard"
```

---

## Task 3: Aba Empresarial com pró-labore

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Modify: `tests/pages/Dashboard.test.tsx`

- [ ] **Step 1: Escrever teste que vai falhar**

Adicionar dentro do `describe('Dashboard tabs', ...)` em `tests/pages/Dashboard.test.tsx`:

```ts
it('aba Empresarial exibe receitas, despesas, saldo e pró-labore', async () => {
  mockFrom(mockTransactionsComPerfil)
  render(<MemoryRouter><Dashboard /></MemoryRouter>)
  await waitFor(() => screen.getByRole('button', { name: /empresarial/i }))
  fireEvent.click(screen.getByRole('button', { name: /empresarial/i }))
  await waitFor(() => {
    expect(screen.getByText(/receitas do mês/i)).toBeInTheDocument()
    expect(screen.getByText(/despesas do mês/i)).toBeInTheDocument()
    expect(screen.getByText(/saldo do mês/i)).toBeInTheDocument()
    expect(screen.getByText(/pró-labore/i)).toBeInTheDocument()
  })
})
```

Adicionar também o mock de `useEmpresarialConfig` no topo do arquivo (logo após o mock do supabase existente):

```ts
vi.mock('../../src/hooks/useEmpresarialConfig', () => ({
  useEmpresarialConfig: () => ({ prolabore: 2000, saveProlabore: vi.fn(), loading: false }),
}))
```

- [ ] **Step 2: Confirmar que o teste falha**

```
npx vitest run tests/pages/Dashboard.test.tsx
```

Esperado: FAIL — aba Empresarial não existe ainda.

- [ ] **Step 3: Importar `useEmpresarialConfig` em `src/pages/Dashboard.tsx`**

Adicionar após os imports existentes:

```ts
import { useEmpresarialConfig } from '../hooks/useEmpresarialConfig'
```

- [ ] **Step 4: Chamar o hook e adicionar useMemo para empresarial**

Após `const [activeTab, setActiveTab] = ...`, adicionar:

```ts
const { prolabore } = useEmpresarialConfig()
const empresarial = useMemo(() => calculatePerfilMonthTotals(transactions, 'empresarial'), [transactions])
```

- [ ] **Step 5: Adicionar conteúdo da aba Empresarial no JSX**

Após o bloco `{activeTab === 'pessoal' && (...)}`, adicionar:

```tsx
{activeTab === 'empresarial' && (
  <div className="grid grid-cols-2 gap-4">
    {[
      { label: 'Receitas do mês', value: empresarial.income, color: 'text-green-600 dark:text-green-400' },
      { label: 'Despesas do mês', value: empresarial.expense, color: 'text-red-600 dark:text-red-400' },
      { label: 'Saldo do mês', value: empresarial.balance, color: empresarial.balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400' },
      { label: 'Pró-labore', value: prolabore, color: 'text-indigo-600 dark:text-indigo-400' },
    ].map(card => (
      <div key={card.label} className="rounded-xl border border-gray-200 dark:border-white/10 p-5 flex flex-col items-center justify-center text-center">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{card.label}</p>
        <p className={`text-2xl font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 6: Confirmar que os testes passam**

```
npx vitest run tests/pages/Dashboard.test.tsx
```

Esperado: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Dashboard.tsx tests/pages/Dashboard.test.tsx
git commit -m "feat: add Empresarial tab with pro-labore to Dashboard"
```

---

## Task 4: Aba Kommo

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Modify: `tests/pages/Dashboard.test.tsx`

- [ ] **Step 1: Escrever teste que vai falhar**

Adicionar dentro do `describe('Dashboard tabs', ...)`:

```ts
it('aba Kommo exibe receitas, valor pago, líquido e saldo', async () => {
  mockFrom(mockTransactionsComPerfil)
  render(<MemoryRouter><Dashboard /></MemoryRouter>)
  await waitFor(() => screen.getByRole('button', { name: /kommo/i }))
  fireEvent.click(screen.getByRole('button', { name: /kommo/i }))
  await waitFor(() => {
    expect(screen.getByText(/receitas brutas/i)).toBeInTheDocument()
    expect(screen.getByText(/valor pago kommo/i)).toBeInTheDocument()
    expect(screen.getByText(/líquido recebido/i)).toBeInTheDocument()
    expect(screen.getByText(/saldo do mês/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Confirmar que o teste falha**

```
npx vitest run tests/pages/Dashboard.test.tsx
```

Esperado: FAIL — aba Kommo não exibe esses cards.

- [ ] **Step 3: Importar `calculateKommoMonthTotals` em `src/pages/Dashboard.tsx`**

Adicionar `calculateKommoMonthTotals` ao import de `'../utils/calculations'`:

```ts
import {
  calculateBalance,
  calculateCurrentMonthTotals,
  calculateMonthlyTotals,
  calculateCategoryTotals,
  filterCurrentMonth,
  calculatePerfilMonthTotals,
  calculateKommoMonthTotals,
} from '../utils/calculations'
```

- [ ] **Step 4: Adicionar useMemo para Kommo**

Após `const empresarial = ...`, adicionar:

```ts
const kommo = useMemo(() => calculateKommoMonthTotals(transactions), [transactions])
```

- [ ] **Step 5: Adicionar conteúdo da aba Kommo no JSX**

Após o bloco `{activeTab === 'empresarial' && (...)}`, adicionar:

```tsx
{activeTab === 'kommo' && (
  <div className="grid grid-cols-2 gap-4">
    {[
      { label: 'Receitas brutas', value: kommo.income, color: 'text-green-600 dark:text-green-400' },
      { label: 'Valor pago Kommo', value: kommo.valorPagoKommo, color: 'text-red-600 dark:text-red-400' },
      { label: 'Líquido recebido', value: kommo.valorLiquidoRecebido, color: 'text-blue-600 dark:text-blue-400' },
      { label: 'Saldo do mês', value: kommo.income - kommo.valorPagoKommo, color: (kommo.income - kommo.valorPagoKommo) >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400' },
    ].map(card => (
      <div key={card.label} className="rounded-xl border border-gray-200 dark:border-white/10 p-5 flex flex-col items-center justify-center text-center">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{card.label}</p>
        <p className={`text-2xl font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 6: Confirmar que todos os testes passam**

```
npm test
```

Esperado: PASS — todos os testes do projeto.

- [ ] **Step 7: Commit final**

```bash
git add src/pages/Dashboard.tsx tests/pages/Dashboard.test.tsx
git commit -m "feat: add Kommo tab to Dashboard"
```
