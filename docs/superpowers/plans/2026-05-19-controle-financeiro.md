# Controle Financeiro Pessoal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal finance dashboard with email/password auth, running as both a web app and an Electron desktop app, backed by Supabase.

**Architecture:** React + Vite (TypeScript) frontend communicates directly with Supabase via `supabase-js` for auth and PostgreSQL CRUD. Electron wraps the same React app for desktop. No separate backend.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS, Recharts, React Router v6, Supabase, Electron, Vitest, React Testing Library.

---

## File Structure

```
/
├── electron/
│   └── main.js                        # Electron entry — opens React app in a window
├── src/
│   ├── main.tsx                       # React entry point
│   ├── App.tsx                        # Root: router + auth guard
│   ├── lib/
│   │   └── supabase.ts                # Supabase client singleton
│   ├── types/
│   │   └── index.ts                   # Shared domain types
│   ├── hooks/
│   │   ├── useAuth.ts                 # Session, signIn, signOut, resetPassword
│   │   ├── useCategories.ts           # Categories CRUD
│   │   ├── useTransactions.ts         # Transactions CRUD with filters
│   │   └── useGoals.ts                # Goals CRUD
│   ├── utils/
│   │   ├── calculations.ts            # Balance, totals, progress, risk
│   │   ├── formatters.ts              # Currency + date display
│   │   └── csv.ts                     # CSV content builder + download trigger
│   ├── components/
│   │   ├── ProtectedRoute.tsx         # Redirects unauthenticated users
│   │   ├── Layout.tsx                 # Sidebar + Outlet shell
│   │   └── Toast.tsx                  # Toast notification component
│   └── pages/
│       ├── Login.tsx
│       ├── Dashboard.tsx
│       ├── Transactions.tsx
│       ├── Categories.tsx
│       ├── Goals.tsx
│       └── Reports.tsx
├── supabase/
│   └── migrations/
│       └── 001_initial.sql            # Tables + RLS + trigger
├── tests/
│   ├── setup.ts                       # jest-dom setup
│   ├── utils/
│   │   ├── calculations.test.ts
│   │   └── csv.test.ts
│   └── pages/
│       ├── Login.test.tsx
│       ├── Categories.test.tsx
│       └── Transactions.test.tsx
├── .env.example
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

---

## Task 1: Project Setup & Configuration

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.js`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `tests/setup.ts`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Scaffold Vite project**

```bash
npm create vite@latest . -- --template react-ts
```

- [ ] **Step 2: Install all dependencies**

```bash
npm install @supabase/supabase-js react-router-dom recharts
npm install -D tailwindcss postcss autoprefixer @tailwindcss/forms vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event concurrently wait-on electron electron-builder
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind — replace `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [require('@tailwindcss/forms')],
}
```

- [ ] **Step 4: Add Tailwind directives to `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Configure Vitest in `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
  },
})
```

- [ ] **Step 6: Create `tests/setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Create `.env.example`**

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 8: Update `tsconfig.json` to include test globals**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 9: Add scripts to `package.json`**

Merge into the `"scripts"` section (keep existing entries, add/replace these):

```json
{
  "main": "electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "electron:dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "npm run build && electron-builder"
  }
}
```

- [ ] **Step 10: Create `.gitignore`**

```
node_modules
dist
dist-electron
.env
.env.local
```

- [ ] **Step 11: Verify setup runs**

```bash
npm run dev
```

Expected: Vite dev server starts at `http://localhost:5173`

- [ ] **Step 12: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold project with Vite, React, Tailwind, Vitest, Electron"
```

---

## Task 2: Database Schema & Supabase Client

**Files:**
- Create: `supabase/migrations/001_initial.sql`
- Create: `src/lib/supabase.ts`

- [ ] **Step 1: Create Supabase project**

Go to https://supabase.com, create a new project, then copy `Project URL` and `anon public key` to `.env`:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

- [ ] **Step 2: Create `supabase/migrations/001_initial.sql`**

```sql
-- profiles
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

-- categories
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  color text not null default '#6366f1',
  created_at timestamp with time zone default timezone('utc', now()) not null
);

-- transactions
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  amount numeric(12, 2) not null check (amount > 0),
  type text not null check (type in ('income', 'expense')),
  date date not null,
  notes text,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

-- goals
create table public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  target numeric(12, 2) not null check (target > 0),
  current numeric(12, 2) not null default 0 check (current >= 0),
  deadline date not null,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

-- RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.goals enable row level security;

-- profiles policies
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- categories policies
create policy "own categories select" on public.categories for select using (auth.uid() = user_id);
create policy "own categories insert" on public.categories for insert with check (auth.uid() = user_id);
create policy "own categories update" on public.categories for update using (auth.uid() = user_id);
create policy "own categories delete" on public.categories for delete using (auth.uid() = user_id);

-- transactions policies
create policy "own transactions select" on public.transactions for select using (auth.uid() = user_id);
create policy "own transactions insert" on public.transactions for insert with check (auth.uid() = user_id);
create policy "own transactions update" on public.transactions for update using (auth.uid() = user_id);
create policy "own transactions delete" on public.transactions for delete using (auth.uid() = user_id);

-- goals policies
create policy "own goals select" on public.goals for select using (auth.uid() = user_id);
create policy "own goals insert" on public.goals for insert with check (auth.uid() = user_id);
create policy "own goals update" on public.goals for update using (auth.uid() = user_id);
create policy "own goals delete" on public.goals for delete using (auth.uid() = user_id);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

- [ ] **Step 3: Run migration in Supabase**

In the Supabase dashboard → SQL Editor → paste the entire content of `001_initial.sql` → Run.

- [ ] **Step 4: Enable email confirmations (optional)**

In Supabase dashboard → Authentication → Email → disable "Confirm email" for local development if you want to skip the confirmation step.

- [ ] **Step 5: Create `src/lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 6: Commit**

```bash
git add supabase/ src/lib/supabase.ts .env.example
git commit -m "feat: database schema, RLS policies, and Supabase client"
```

---

## Task 3: TypeScript Types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Create `src/types/index.ts`**

```typescript
export interface Category {
  id: string
  user_id: string
  name: string
  type: 'income' | 'expense'
  color: string
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  category_id: string | null
  title: string
  amount: number
  type: 'income' | 'expense'
  date: string
  notes: string | null
  created_at: string
  categories?: Category
}

export interface Goal {
  id: string
  user_id: string
  title: string
  target: number
  current: number
  deadline: string
  created_at: string
}

export interface MonthlyTotals {
  month: string
  income: number
  expense: number
}

export interface CategoryTotal {
  name: string
  value: number
  color: string
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/types/
git commit -m "feat: shared TypeScript domain types"
```

---

## Task 4: Utility Functions (TDD)

**Files:**
- Create: `src/utils/calculations.ts`
- Create: `src/utils/formatters.ts`
- Create: `src/utils/csv.ts`
- Create: `tests/utils/calculations.test.ts`
- Create: `tests/utils/csv.test.ts`

- [ ] **Step 1: Write failing tests — `tests/utils/calculations.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import {
  calculateBalance,
  calculateCurrentMonthTotals,
  calculateMonthlyTotals,
  calculateCategoryTotals,
  calculateGoalProgress,
  isGoalAtRisk,
} from '../../src/utils/calculations'
import type { Transaction, Goal } from '../../src/types'

const TODAY = new Date()
const YEAR = TODAY.getFullYear()
const MONTH = String(TODAY.getMonth() + 1).padStart(2, '0')

const cat1: import('../../src/types').Category = {
  id: 'c1', user_id: 'u1', name: 'Trabalho', type: 'income', color: '#22c55e', created_at: '',
}
const cat2: import('../../src/types').Category = {
  id: 'c2', user_id: 'u1', name: 'Alimentação', type: 'expense', color: '#ef4444', created_at: '',
}

const transactions: Transaction[] = [
  { id: '1', user_id: 'u1', category_id: 'c1', title: 'Salário', amount: 5000, type: 'income', date: `${YEAR}-${MONTH}-01`, notes: null, created_at: '', categories: cat1 },
  { id: '2', user_id: 'u1', category_id: 'c2', title: 'Mercado', amount: 300, type: 'expense', date: `${YEAR}-${MONTH}-05`, notes: null, created_at: '', categories: cat2 },
  { id: '3', user_id: 'u1', category_id: 'c2', title: 'Restaurante', amount: 100, type: 'expense', date: `${YEAR}-${MONTH}-10`, notes: null, created_at: '', categories: cat2 },
]

describe('calculateBalance', () => {
  it('subtracts expenses from income', () => {
    expect(calculateBalance(transactions)).toBe(4600)
  })
  it('returns 0 for empty array', () => {
    expect(calculateBalance([])).toBe(0)
  })
})

describe('calculateCurrentMonthTotals', () => {
  it('sums income and expense for the current month', () => {
    const result = calculateCurrentMonthTotals(transactions)
    expect(result.income).toBe(5000)
    expect(result.expense).toBe(400)
  })
})

describe('calculateMonthlyTotals', () => {
  it('returns an array of length equal to months param', () => {
    const result = calculateMonthlyTotals(transactions, 6)
    expect(result).toHaveLength(6)
  })
  it('last entry matches current month totals', () => {
    const result = calculateMonthlyTotals(transactions, 6)
    const last = result[result.length - 1]
    expect(last.income).toBe(5000)
    expect(last.expense).toBe(400)
  })
})

describe('calculateCategoryTotals', () => {
  it('groups expense transactions by category', () => {
    const result = calculateCategoryTotals(transactions)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Alimentação')
    expect(result[0].value).toBe(400)
  })
  it('excludes income transactions', () => {
    const result = calculateCategoryTotals(transactions)
    expect(result.find(r => r.name === 'Trabalho')).toBeUndefined()
  })
})

describe('calculateGoalProgress', () => {
  it('returns percentage of current/target', () => {
    const goal: Goal = { id: '1', user_id: 'u1', title: 'Meta', target: 1000, current: 250, deadline: '2026-12-31', created_at: '2026-01-01' }
    expect(calculateGoalProgress(goal)).toBe(25)
  })
  it('caps at 100 when current exceeds target', () => {
    const goal: Goal = { id: '1', user_id: 'u1', title: 'Meta', target: 100, current: 150, deadline: '2026-12-31', created_at: '2026-01-01' }
    expect(calculateGoalProgress(goal)).toBe(100)
  })
  it('returns 0 for zero target', () => {
    const goal: Goal = { id: '1', user_id: 'u1', title: 'Meta', target: 0, current: 0, deadline: '2026-12-31', created_at: '2026-01-01' }
    expect(calculateGoalProgress(goal)).toBe(0)
  })
})

describe('isGoalAtRisk', () => {
  it('returns true when deadline is within 30 days and progress is behind schedule', () => {
    const soon = new Date()
    soon.setDate(soon.getDate() + 15)
    const goal: Goal = {
      id: '1', user_id: 'u1', title: 'Meta', target: 1000, current: 100,
      deadline: soon.toISOString().split('T')[0],
      created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    }
    expect(isGoalAtRisk(goal)).toBe(true)
  })
  it('returns false when progress is on track', () => {
    const far = new Date()
    far.setFullYear(far.getFullYear() + 1)
    const goal: Goal = {
      id: '1', user_id: 'u1', title: 'Meta', target: 1000, current: 900,
      deadline: far.toISOString().split('T')[0],
      created_at: '2026-01-01',
    }
    expect(isGoalAtRisk(goal)).toBe(false)
  })
})
```

- [ ] **Step 2: Write failing test — `tests/utils/csv.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { buildCSVContent } from '../../src/utils/csv'
import type { Transaction } from '../../src/types'

const transactions: Transaction[] = [
  {
    id: '1', user_id: 'u1', category_id: 'c1', title: 'Salário', amount: 5000,
    type: 'income', date: '2026-05-01', notes: null, created_at: '',
    categories: { id: 'c1', user_id: 'u1', name: 'Trabalho', type: 'income', color: '#22c55e', created_at: '' },
  },
]

describe('buildCSVContent', () => {
  it('includes header row', () => {
    const csv = buildCSVContent(transactions)
    expect(csv).toContain('Data')
    expect(csv).toContain('Título')
    expect(csv).toContain('Valor')
  })
  it('maps income type to Receita', () => {
    const csv = buildCSVContent(transactions)
    expect(csv).toContain('Receita')
  })
  it('includes transaction title and amount', () => {
    const csv = buildCSVContent(transactions)
    expect(csv).toContain('Salário')
    expect(csv).toContain('5000.00')
  })
  it('includes category name', () => {
    const csv = buildCSVContent(transactions)
    expect(csv).toContain('Trabalho')
  })
})
```

- [ ] **Step 3: Run tests to confirm failures**

```bash
npm test
```

Expected: multiple test failures — functions not defined

- [ ] **Step 4: Implement `src/utils/calculations.ts`**

```typescript
import type { Transaction, Goal, MonthlyTotals, CategoryTotal } from '../types'

export function calculateBalance(transactions: Transaction[]): number {
  return transactions.reduce(
    (acc, t) => (t.type === 'income' ? acc + t.amount : acc - t.amount),
    0,
  )
}

export function calculateCurrentMonthTotals(transactions: Transaction[]): { income: number; expense: number } {
  const now = new Date()
  const filtered = transactions.filter(t => {
    const d = new Date(t.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  return {
    income: filtered.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0),
    expense: filtered.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0),
  }
}

export function calculateMonthlyTotals(transactions: Transaction[], months = 6): MonthlyTotals[] {
  const now = new Date()
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1)
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    const filtered = transactions.filter(t => {
      const td = new Date(t.date)
      return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth()
    })
    return {
      month: label,
      income: filtered.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0),
      expense: filtered.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0),
    }
  })
}

export function calculateCategoryTotals(transactions: Transaction[]): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>()
  transactions
    .filter(t => t.type === 'expense' && t.categories)
    .forEach(t => {
      const cat = t.categories!
      const existing = map.get(cat.id)
      if (existing) {
        existing.value += t.amount
      } else {
        map.set(cat.id, { name: cat.name, value: t.amount, color: cat.color })
      }
    })
  return Array.from(map.values())
}

export function calculateGoalProgress(goal: Goal): number {
  if (goal.target === 0) return 0
  return Math.min(Math.round((goal.current / goal.target) * 100), 100)
}

export function isGoalAtRisk(goal: Goal): boolean {
  const now = Date.now()
  const deadline = new Date(goal.deadline).getTime()
  const created = new Date(goal.created_at).getTime()
  const daysLeft = (deadline - now) / (1000 * 60 * 60 * 24)
  if (daysLeft <= 0) return goal.current < goal.target
  const totalDays = (deadline - created) / (1000 * 60 * 60 * 24)
  const expectedProgress = totalDays > 0 ? 1 - daysLeft / totalDays : 1
  const actualProgress = goal.target > 0 ? goal.current / goal.target : 1
  return daysLeft <= 30 && actualProgress < expectedProgress
}
```

- [ ] **Step 5: Implement `src/utils/formatters.ts`**

```typescript
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}
```

- [ ] **Step 6: Implement `src/utils/csv.ts`**

```typescript
import type { Transaction } from '../types'

export function buildCSVContent(transactions: Transaction[]): string {
  const headers = ['Data', 'Título', 'Tipo', 'Categoria', 'Valor', 'Observação']
  const rows = transactions.map(t => [
    t.date,
    t.title,
    t.type === 'income' ? 'Receita' : 'Despesa',
    t.categories?.name ?? '',
    t.amount.toFixed(2),
    t.notes ?? '',
  ])
  return [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

export function exportTransactionsToCSV(transactions: Transaction[], filename = 'transacoes.csv'): void {
  const csvContent = buildCSVContent(transactions)
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 7: Run tests to confirm all pass**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 8: Commit**

```bash
git add src/utils/ tests/utils/
git commit -m "feat: utility functions for calculations, formatting, and CSV export (TDD)"
```

---

## Task 5: Auth Hook

**Files:**
- Create: `src/hooks/useAuth.ts`

- [ ] **Step 1: Create `src/hooks/useAuth.ts`**

```typescript
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  }

  return { user, loading, signIn, signOut, resetPassword }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useAuth.ts
git commit -m "feat: useAuth hook with signIn, signOut, and resetPassword"
```

---

## Task 6: App Shell — Router, Layout, Protected Routes

**Files:**
- Create: `src/components/ProtectedRoute.tsx`
- Create: `src/components/Layout.tsx`
- Create: `src/components/Toast.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Create `src/components/ProtectedRoute.tsx`**

```tsx
import type { User } from '@supabase/supabase-js'
import { Navigate, Outlet } from 'react-router-dom'

interface Props {
  user: User | null
}

export default function ProtectedRoute({ user }: Props) {
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
```

- [ ] **Step 2: Create `src/components/Toast.tsx`**

```tsx
import { useEffect } from 'react'

interface Props {
  message: string
  type?: 'success' | 'error'
  onClose: () => void
}

export default function Toast({ message, type = 'success', onClose }: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500)
    return () => clearTimeout(timer)
  }, [onClose])

  const bg = type === 'error' ? 'bg-red-500' : 'bg-green-500'

  return (
    <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg text-white text-sm shadow-lg ${bg}`}>
      {message}
    </div>
  )
}
```

- [ ] **Step 3: Create `src/components/Layout.tsx`**

```tsx
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/transactions', label: 'Transações', end: false },
  { to: '/categories', label: 'Categorias', end: false },
  { to: '/goals', label: 'Metas', end: false },
  { to: '/reports', label: 'Relatórios', end: false },
]

export default function Layout() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-200">
          <span className="text-lg font-bold text-indigo-600">FinanceApp</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
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
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Create placeholder page stubs** (will be replaced in later tasks)

Create each of these with a single `<div>` placeholder:

`src/pages/Dashboard.tsx`:
```tsx
export default function Dashboard() { return <div>Dashboard</div> }
```

`src/pages/Transactions.tsx`:
```tsx
export default function Transactions() { return <div>Transações</div> }
```

`src/pages/Categories.tsx`:
```tsx
export default function Categories() { return <div>Categorias</div> }
```

`src/pages/Goals.tsx`:
```tsx
export default function Goals() { return <div>Metas</div> }
```

`src/pages/Reports.tsx`:
```tsx
export default function Reports() { return <div>Relatórios</div> }
```

- [ ] **Step 5: Create `src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Categories from './pages/Categories'
import Goals from './pages/Goals'
import Reports from './pages/Reports'

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
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route element={<ProtectedRoute user={user} />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/reports" element={<Reports />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 6: Update `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 7: Verify app starts without errors**

```bash
npm run dev
```

Expected: app loads, redirects unauthenticated users to `/login` (which doesn't exist yet — a blank page is fine at this stage)

- [ ] **Step 8: Commit**

```bash
git add src/
git commit -m "feat: app shell with router, protected routes, and layout"
```

---

## Task 7: Login Page (TDD)

**Files:**
- Create: `src/pages/Login.tsx`
- Create: `tests/pages/Login.test.tsx`

- [ ] **Step 1: Write failing test — `tests/pages/Login.test.tsx`**

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Login from '../../src/pages/Login'

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}))

import { supabase } from '../../src/lib/supabase'

function renderLogin() {
  return render(<MemoryRouter><Login /></MemoryRouter>)
}

describe('Login page', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders email and password fields', () => {
    renderLogin()
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
  })

  it('calls signInWithPassword on submit', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ data: { user: null, session: null }, error: null } as any)
    renderLogin()
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'user@test.com' } })
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: '123456',
      })
    })
  })

  it('shows error message on failed login', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockRejectedValue(new Error('Invalid'))
    renderLogin()
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'bad@test.com' } })
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => {
      expect(screen.getByText(/e-mail ou senha incorretos/i)).toBeInTheDocument()
    })
  })

  it('shows reset form when "Esqueci minha senha" is clicked', () => {
    renderLogin()
    fireEvent.click(screen.getByText(/esqueci minha senha/i))
    expect(screen.getByRole('button', { name: /enviar/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm failures**

```bash
npm test tests/pages/Login.test.tsx
```

Expected: FAIL — Login module not found

- [ ] **Step 3: Implement `src/pages/Login.tsx`**

```tsx
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { signIn, resetPassword } = useAuth()
  const [mode, setMode] = useState<'login' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await resetPassword(email)
        setInfo('E-mail de redefinição enviado. Verifique sua caixa de entrada.')
      }
    } catch {
      setError(mode === 'login' ? 'E-mail ou senha incorretos' : 'Não foi possível enviar o e-mail.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">FinanceApp</h1>
        <p className="text-sm text-gray-500 mb-6">
          {mode === 'login' ? 'Entre na sua conta' : 'Redefinir senha'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {mode === 'login' && (
            <div>
              <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
                id="senha"
                type="password"
                required
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
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Enviar'}
          </button>
        </form>

        <button
          onClick={() => { setMode(m => m === 'login' ? 'reset' : 'login'); setError(''); setInfo('') }}
          className="mt-4 text-sm text-indigo-600 hover:underline"
        >
          {mode === 'login' ? 'Esqueci minha senha' : '← Voltar para o login'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm all pass**

```bash
npm test tests/pages/Login.test.tsx
```

Expected: all 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/pages/Login.tsx tests/pages/Login.test.tsx
git commit -m "feat: login page with forgot-password flow (TDD)"
```

---

## Task 8: Categories Feature (TDD)

**Files:**
- Create: `src/hooks/useCategories.ts`
- Modify: `src/pages/Categories.tsx`
- Create: `tests/pages/Categories.test.tsx`

- [ ] **Step 1: Write failing test — `tests/pages/Categories.test.tsx`**

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Categories from '../../src/pages/Categories'

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn(),
  },
}))

import { supabase } from '../../src/lib/supabase'

const mockCategories = [
  { id: 'c1', user_id: 'u1', name: 'Alimentação', type: 'expense', color: '#ef4444', created_at: '' },
  { id: 'c2', user_id: 'u1', name: 'Salário', type: 'income', color: '#22c55e', created_at: '' },
]

function mockFrom(data: any[], countResult = 0) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error: null }),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockReturnThis(),
  }
  chain.select.mockImplementation((cols: string, opts?: any) => {
    if (opts?.count) return { ...chain, then: (cb: any) => cb({ count: countResult, error: null }) }
    return chain
  })
  vi.mocked(supabase.from).mockReturnValue(chain as any)
  return chain
}

describe('Categories page', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders list of categories', async () => {
    mockFrom(mockCategories)
    render(<MemoryRouter><Categories /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Alimentação')).toBeInTheDocument()
      expect(screen.getByText('Salário')).toBeInTheDocument()
    })
  })

  it('opens modal when "Nova Categoria" is clicked', async () => {
    mockFrom(mockCategories)
    render(<MemoryRouter><Categories /></MemoryRouter>)
    await waitFor(() => screen.getByText('Alimentação'))
    fireEvent.click(screen.getByRole('button', { name: /nova categoria/i }))
    expect(screen.getByRole('heading', { name: /nova categoria/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm failures**

```bash
npm test tests/pages/Categories.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement `src/hooks/useCategories.ts`**

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Category } from '../types'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetch() }, [])

  async function fetch() {
    setLoading(true)
    const { data, error } = await supabase.from('categories').select('*').order('name')
    if (error) { setError(error.message); setLoading(false); return }
    setCategories(data)
    setLoading(false)
  }

  async function createCategory(values: Pick<Category, 'name' | 'type' | 'color'>) {
    const { error } = await supabase.from('categories').insert(values)
    if (error) throw error
    await fetch()
  }

  async function updateCategory(id: string, values: Pick<Category, 'name' | 'type' | 'color'>) {
    const { error } = await supabase.from('categories').update(values).eq('id', id)
    if (error) throw error
    await fetch()
  }

  async function deleteCategory(id: string) {
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id) as any
    if ((count ?? 0) > 0) throw new Error('Não é possível excluir uma categoria com transações vinculadas.')
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw error
    await fetch()
  }

  return { categories, loading, error, createCategory, updateCategory, deleteCategory }
}
```

- [ ] **Step 4: Implement `src/pages/Categories.tsx`**

```tsx
import { useState } from 'react'
import { useCategories } from '../hooks/useCategories'
import type { Category } from '../types'
import Toast from '../components/Toast'

const COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6']

interface FormState { name: string; type: 'income' | 'expense'; color: string }
const defaultForm: FormState = { name: '', type: 'expense', color: '#6366f1' }

export default function Categories() {
  const { categories, loading, createCategory, updateCategory, deleteCategory } = useCategories()
  const [modal, setModal] = useState<{ open: boolean; editing: Category | null }>({ open: false, editing: null })
  const [form, setForm] = useState<FormState>(defaultForm)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  function openCreate() {
    setForm(defaultForm)
    setModal({ open: true, editing: null })
  }

  function openEdit(cat: Category) {
    setForm({ name: cat.name, type: cat.type, color: cat.color })
    setModal({ open: true, editing: cat })
  }

  function closeModal() {
    setModal({ open: false, editing: null })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (modal.editing) {
        await updateCategory(modal.editing.id, form)
        setToast({ message: 'Categoria atualizada.', type: 'success' })
      } else {
        await createCategory(form)
        setToast({ message: 'Categoria criada.', type: 'success' })
      }
      closeModal()
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir categoria?')) return
    try {
      await deleteCategory(id)
      setToast({ message: 'Categoria excluída.', type: 'success' })
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' })
    }
  }

  if (loading) return <p className="text-sm text-gray-400">Carregando...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Categorias</h2>
        <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          Nova Categoria
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {categories.length === 0 && (
          <p className="p-6 text-sm text-gray-400 text-center">Nenhuma categoria cadastrada.</p>
        )}
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="text-sm font-medium text-gray-800">{cat.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.type === 'income' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {cat.type === 'income' ? 'Receita' : 'Despesa'}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(cat)} className="text-sm text-indigo-600 hover:underline">Editar</button>
              <button onClick={() => handleDelete(cat.id)} className="text-sm text-red-500 hover:underline">Excluir</button>
            </div>
          </div>
        ))}
      </div>

      {modal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {modal.editing ? 'Editar Categoria' : 'Nova Categoria'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as 'income' | 'expense' }))}
                  className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
```

- [ ] **Step 5: Run tests to confirm pass**

```bash
npm test tests/pages/Categories.test.tsx
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useCategories.ts src/pages/Categories.tsx tests/pages/Categories.test.tsx
git commit -m "feat: categories feature with CRUD and delete validation (TDD)"
```

---

## Task 9: Transactions Feature (TDD)

**Files:**
- Create: `src/hooks/useTransactions.ts`
- Modify: `src/pages/Transactions.tsx`
- Create: `tests/pages/Transactions.test.tsx`

- [ ] **Step 1: Write failing test — `tests/pages/Transactions.test.tsx`**

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Transactions from '../../src/pages/Transactions'

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn(),
  },
}))

import { supabase } from '../../src/lib/supabase'

const mockTransactions = [
  { id: 't1', user_id: 'u1', category_id: 'c1', title: 'Salário', amount: 5000, type: 'income', date: '2026-05-01', notes: null, created_at: '', categories: { id: 'c1', user_id: 'u1', name: 'Trabalho', type: 'income', color: '#22c55e', created_at: '' } },
  { id: 't2', user_id: 'u1', category_id: 'c2', title: 'Mercado', amount: 300, type: 'expense', date: '2026-05-05', notes: null, created_at: '', categories: { id: 'c2', user_id: 'u1', name: 'Alimentação', type: 'expense', color: '#ef4444', created_at: '' } },
]

const mockCategories = [
  { id: 'c1', user_id: 'u1', name: 'Trabalho', type: 'income', color: '#22c55e', created_at: '' },
  { id: 'c2', user_id: 'u1', name: 'Alimentação', type: 'expense', color: '#ef4444', created_at: '' },
]

function mockFrom(table: string) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: table === 'categories' ? mockCategories : mockTransactions,
      error: null,
    }),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  }
  return chain
}

describe('Transactions page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabase.from).mockImplementation((table: string) => mockFrom(table) as any)
  })

  it('renders transactions in table', async () => {
    render(<MemoryRouter><Transactions /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Salário')).toBeInTheDocument()
      expect(screen.getByText('Mercado')).toBeInTheDocument()
    })
  })

  it('opens modal when "Nova Transação" is clicked', async () => {
    render(<MemoryRouter><Transactions /></MemoryRouter>)
    await waitFor(() => screen.getByText('Salário'))
    fireEvent.click(screen.getByRole('button', { name: /nova transação/i }))
    expect(screen.getByRole('heading', { name: /nova transação/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm failures**

```bash
npm test tests/pages/Transactions.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement `src/hooks/useTransactions.ts`**

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Transaction } from '../types'

export interface TransactionFilters {
  startDate?: string
  endDate?: string
  type?: 'income' | 'expense' | ''
  categoryId?: string
}

export function useTransactions(filters: TransactionFilters = {}) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetchAll() }, [filters.startDate, filters.endDate, filters.type, filters.categoryId])

  async function fetchAll() {
    setLoading(true)
    let q = supabase.from('transactions').select('*, categories(*)').order('date', { ascending: false })
    if (filters.startDate) q = q.gte('date', filters.startDate)
    if (filters.endDate) q = q.lte('date', filters.endDate)
    if (filters.type) q = q.eq('type', filters.type)
    if (filters.categoryId) q = q.eq('category_id', filters.categoryId)
    const { data, error } = await q
    if (error) { setError(error.message); setLoading(false); return }
    setTransactions(data)
    setLoading(false)
  }

  async function createTransaction(values: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'categories'>) {
    const { error } = await supabase.from('transactions').insert(values)
    if (error) throw error
    await fetchAll()
  }

  async function updateTransaction(id: string, values: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'categories'>) {
    const { error } = await supabase.from('transactions').update(values).eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  async function deleteTransaction(id: string) {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  return { transactions, loading, error, createTransaction, updateTransaction, deleteTransaction, refetch: fetchAll }
}
```

- [ ] **Step 4: Implement `src/pages/Transactions.tsx`**

```tsx
import { useState } from 'react'
import { useTransactions, type TransactionFilters } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import type { Transaction } from '../types'
import { formatCurrency, formatDate } from '../utils/formatters'
import Toast from '../components/Toast'

interface FormState {
  title: string
  amount: string
  category_id: string
  type: 'income' | 'expense'
  date: string
  notes: string
}

const defaultForm: FormState = {
  title: '', amount: '', category_id: '', type: 'expense',
  date: new Date().toISOString().split('T')[0], notes: '',
}

const PAGE_SIZE = 10

export default function Transactions() {
  const [filters, setFilters] = useState<TransactionFilters>({})
  const [page, setPage] = useState(0)
  const { transactions, loading, createTransaction, updateTransaction, deleteTransaction } = useTransactions(filters)
  const { categories } = useCategories()
  const [modal, setModal] = useState<{ open: boolean; editing: Transaction | null }>({ open: false, editing: null })
  const [form, setForm] = useState<FormState>(defaultForm)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const paginated = transactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(transactions.length / PAGE_SIZE)

  function openCreate() {
    setForm(defaultForm)
    setModal({ open: true, editing: null })
  }

  function openEdit(t: Transaction) {
    setForm({ title: t.title, amount: String(t.amount), category_id: t.category_id ?? '', type: t.type, date: t.date, notes: t.notes ?? '' })
    setModal({ open: true, editing: t })
  }

  function closeModal() { setModal({ open: false, editing: null }) }

  function handleCategoryChange(catId: string) {
    const cat = categories.find(c => c.id === catId)
    setForm(f => ({ ...f, category_id: catId, type: cat?.type ?? f.type }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const values = {
      title: form.title,
      amount: parseFloat(form.amount),
      category_id: form.category_id || null,
      type: form.type,
      date: form.date,
      notes: form.notes || null,
    }
    try {
      if (modal.editing) {
        await updateTransaction(modal.editing.id, values)
        setToast({ message: 'Transação atualizada.', type: 'success' })
      } else {
        await createTransaction(values)
        setToast({ message: 'Transação criada.', type: 'success' })
      }
      closeModal()
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir transação?')) return
    try {
      await deleteTransaction(id)
      setToast({ message: 'Transação excluída.', type: 'success' })
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Transações</h2>
        <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          Nova Transação
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="date"
          value={filters.startDate ?? ''}
          onChange={e => { setFilters(f => ({ ...f, startDate: e.target.value || undefined })); setPage(0) }}
          className="rounded-lg border-gray-300 text-sm"
          placeholder="De"
        />
        <input
          type="date"
          value={filters.endDate ?? ''}
          onChange={e => { setFilters(f => ({ ...f, endDate: e.target.value || undefined })); setPage(0) }}
          className="rounded-lg border-gray-300 text-sm"
        />
        <select
          value={filters.type ?? ''}
          onChange={e => { setFilters(f => ({ ...f, type: (e.target.value as any) || undefined })); setPage(0) }}
          className="rounded-lg border-gray-300 text-sm"
        >
          <option value="">Todos os tipos</option>
          <option value="income">Receita</option>
          <option value="expense">Despesa</option>
        </select>
        <select
          value={filters.categoryId ?? ''}
          onChange={e => { setFilters(f => ({ ...f, categoryId: e.target.value || undefined })); setPage(0) }}
          className="rounded-lg border-gray-300 text-sm"
        >
          <option value="">Todas as categorias</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Data', 'Título', 'Categoria', 'Tipo', 'Valor', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nenhuma transação encontrada.</td></tr>
              )}
              {paginated.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{formatDate(t.date)}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{t.title}</td>
                  <td className="px-4 py-3 text-gray-500">{t.categories?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.type === 'income' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {t.type === 'income' ? 'Receita' : 'Despesa'}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(t)} className="text-indigo-600 hover:underline">Editar</button>
                      <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:underline">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-sm text-indigo-600 disabled:opacity-40">← Anterior</button>
              <span className="text-sm text-gray-500">{page + 1} / {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="text-sm text-indigo-600 disabled:opacity-40">Próxima →</button>
            </div>
          )}
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {modal.editing ? 'Editar Transação' : 'Nova Transação'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select value={form.category_id} onChange={e => handleCategoryChange(e.target.value)} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                  <option value="">Sem categoria</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                  <input type="number" required min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observação (opcional)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
```

- [ ] **Step 5: Run tests to confirm pass**

```bash
npm test tests/pages/Transactions.test.tsx
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useTransactions.ts src/pages/Transactions.tsx tests/pages/Transactions.test.tsx
git commit -m "feat: transactions feature with paginated table, filters, and CRUD modal (TDD)"
```

---

## Task 10: Dashboard Page

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Implement `src/pages/Dashboard.tsx`**

```tsx
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useTransactions } from '../hooks/useTransactions'
import {
  calculateBalance,
  calculateCurrentMonthTotals,
  calculateMonthlyTotals,
  calculateCategoryTotals,
} from '../utils/calculations'
import { formatCurrency, formatDate } from '../utils/formatters'

export default function Dashboard() {
  const { transactions, loading } = useTransactions()

  if (loading) return <p className="text-sm text-gray-400">Carregando...</p>

  const balance = calculateBalance(transactions)
  const { income, expense } = calculateCurrentMonthTotals(transactions)
  const monthly = calculateMonthlyTotals(transactions, 6)
  const now = new Date()
  const currentMonthTransactions = transactions.filter(t => {
    const d = new Date(t.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  const categoryTotals = calculateCategoryTotals(currentMonthTransactions)
  const recent = transactions.slice(0, 5)

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Saldo atual', value: balance, color: balance >= 0 ? 'text-gray-900' : 'text-red-600' },
          { label: 'Receitas do mês', value: income, color: 'text-green-600' },
          { label: 'Despesas do mês', value: expense, color: 'text-red-600' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-700 mb-4">Gastos por categoria (mês atual)</p>
          {categoryTotals.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryTotals} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                  {categoryTotals.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-700 mb-4">Receitas vs Despesas (6 meses)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="income" name="Receita" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-gray-700">Últimas transações</p>
          <Link to="/transactions" className="text-sm text-indigo-600 hover:underline">Ver todas</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhuma transação registrada.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {recent.map(t => (
              <div key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{t.title}</p>
                  <p className="text-xs text-gray-400">{t.categories?.name ?? '—'} · {formatDate(t.date)}</p>
                </div>
                <span className={`text-sm font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify dashboard renders in browser**

```bash
npm run dev
```

Open `http://localhost:5173`, log in, and confirm: cards show, charts render, recent transactions list appears.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: dashboard with summary cards, pie chart, bar chart, and recent transactions"
```

---

## Task 11: Goals Feature (TDD)

**Files:**
- Create: `src/hooks/useGoals.ts`
- Modify: `src/pages/Goals.tsx`

- [ ] **Step 1: Implement `src/hooks/useGoals.ts`**

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Goal } from '../types'

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data, error } = await supabase.from('goals').select('*').order('deadline')
    if (error) { setError(error.message); setLoading(false); return }
    setGoals(data)
    setLoading(false)
  }

  async function createGoal(values: Pick<Goal, 'title' | 'target' | 'current' | 'deadline'>) {
    const { error } = await supabase.from('goals').insert(values)
    if (error) throw error
    await fetchAll()
  }

  async function updateGoal(id: string, values: Pick<Goal, 'title' | 'target' | 'current' | 'deadline'>) {
    const { error } = await supabase.from('goals').update(values).eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  async function deleteGoal(id: string) {
    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  return { goals, loading, error, createGoal, updateGoal, deleteGoal }
}
```

- [ ] **Step 2: Implement `src/pages/Goals.tsx`**

```tsx
import { useState } from 'react'
import { useGoals } from '../hooks/useGoals'
import type { Goal } from '../types'
import { calculateGoalProgress, isGoalAtRisk } from '../utils/calculations'
import { formatCurrency, formatDate } from '../utils/formatters'
import Toast from '../components/Toast'

interface FormState { title: string; target: string; current: string; deadline: string }
const defaultForm: FormState = { title: '', target: '', current: '0', deadline: '' }

export default function Goals() {
  const { goals, loading, createGoal, updateGoal, deleteGoal } = useGoals()
  const [modal, setModal] = useState<{ open: boolean; editing: Goal | null }>({ open: false, editing: null })
  const [form, setForm] = useState<FormState>(defaultForm)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  function openCreate() { setForm(defaultForm); setModal({ open: true, editing: null }) }
  function openEdit(g: Goal) {
    setForm({ title: g.title, target: String(g.target), current: String(g.current), deadline: g.deadline })
    setModal({ open: true, editing: g })
  }
  function closeModal() { setModal({ open: false, editing: null }) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const values = { title: form.title, target: parseFloat(form.target), current: parseFloat(form.current), deadline: form.deadline }
    try {
      if (modal.editing) {
        await updateGoal(modal.editing.id, values)
        setToast({ message: 'Meta atualizada.', type: 'success' })
      } else {
        await createGoal(values)
        setToast({ message: 'Meta criada.', type: 'success' })
      }
      closeModal()
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir meta?')) return
    try {
      await deleteGoal(id)
      setToast({ message: 'Meta excluída.', type: 'success' })
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' })
    }
  }

  if (loading) return <p className="text-sm text-gray-400">Carregando...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Metas</h2>
        <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          Nova Meta
        </button>
      </div>

      {goals.length === 0 && <p className="text-sm text-gray-400 text-center py-12">Nenhuma meta cadastrada.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map(g => {
          const progress = calculateGoalProgress(g)
          const atRisk = isGoalAtRisk(g)
          return (
            <div key={g.id} className={`bg-white rounded-xl border p-5 ${atRisk ? 'border-amber-300' : 'border-gray-200'}`}>
              {atRisk && (
                <span className="inline-block mb-2 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  Atenção: prazo próximo
                </span>
              )}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900">{g.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Prazo: {formatDate(g.deadline)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(g)} className="text-sm text-indigo-600 hover:underline">Editar</button>
                  <button onClick={() => handleDelete(g.id)} className="text-sm text-red-500 hover:underline">Excluir</button>
                </div>
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{formatCurrency(g.current)} de {formatCurrency(g.target)}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${progress >= 100 ? 'bg-green-500' : atRisk ? 'bg-amber-400' : 'bg-indigo-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {modal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {modal.editing ? 'Editar Meta' : 'Nova Meta'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor alvo (R$)</label>
                  <input type="number" required min="0.01" step="0.01" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor atual (R$)</label>
                  <input type="number" required min="0" step="0.01" value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prazo</label>
                <input type="date" required value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
```

- [ ] **Step 3: Run all tests to confirm nothing broke**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useGoals.ts src/pages/Goals.tsx
git commit -m "feat: goals feature with progress bars and at-risk alerts"
```

---

## Task 12: Reports Page

**Files:**
- Modify: `src/pages/Reports.tsx`

- [ ] **Step 1: Implement `src/pages/Reports.tsx`**

```tsx
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useTransactions } from '../hooks/useTransactions'
import { calculateCategoryTotals } from '../utils/calculations'
import { formatCurrency, formatDate } from '../utils/formatters'
import { exportTransactionsToCSV } from '../utils/csv'
import type { TransactionFilters } from '../hooks/useTransactions'

type Period = 'month' | 'quarter' | 'year' | 'custom'

function getPeriodDates(period: Period): { startDate: string; endDate: string } {
  const now = new Date()
  const end = now.toISOString().split('T')[0]
  if (period === 'month') {
    return { startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], endDate: end }
  }
  if (period === 'quarter') {
    return { startDate: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0], endDate: end }
  }
  if (period === 'year') {
    return { startDate: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0], endDate: end }
  }
  return { startDate: '', endDate: end }
}

export default function Reports() {
  const [period, setPeriod] = useState<Period>('month')
  const [custom, setCustom] = useState({ startDate: '', endDate: '' })

  const dates = period === 'custom' ? custom : getPeriodDates(period)
  const filters: TransactionFilters = { startDate: dates.startDate || undefined, endDate: dates.endDate || undefined }
  const { transactions, loading } = useTransactions(filters)

  const categoryTotals = calculateCategoryTotals(transactions)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0)
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Relatórios</h2>
        <button
          onClick={() => exportTransactionsToCSV(transactions)}
          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Exportar CSV
        </button>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap gap-2">
        {(['month', 'quarter', 'year', 'custom'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${period === p ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            {{ month: 'Este mês', quarter: 'Trimestre', year: 'Este ano', custom: 'Personalizado' }[p]}
          </button>
        ))}
        {period === 'custom' && (
          <div className="flex gap-2">
            <input type="date" value={custom.startDate} onChange={e => setCustom(c => ({ ...c, startDate: e.target.value }))} className="rounded-lg border-gray-300 text-sm" />
            <input type="date" value={custom.endDate} onChange={e => setCustom(c => ({ ...c, endDate: e.target.value }))} className="rounded-lg border-gray-300 text-sm" />
          </div>
        )}
      </div>

      {loading ? <p className="text-sm text-gray-400">Carregando...</p> : (
        <>
          {/* Totals */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Total de Receitas</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Total de Despesas</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
            </div>
          </div>

          {/* Category chart */}
          {categoryTotals.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-medium text-gray-700 mb-4">Despesas por categoria</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={categoryTotals} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `R$${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {categoryTotals.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Transactions table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Data', 'Título', 'Categoria', 'Tipo', 'Valor'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhuma transação no período.</td></tr>
                )}
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{formatDate(t.date)}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{t.title}</td>
                    <td className="px-4 py-3 text-gray-500">{t.categories?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.type === 'income' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {t.type === 'income' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add src/pages/Reports.tsx
git commit -m "feat: reports page with period filter, charts, transaction table, and CSV export"
```

---

## Task 13: Electron Desktop Setup

**Files:**
- Create: `electron/main.js`

- [ ] **Step 1: Create `electron/main.js`**

```javascript
const { app, BrowserWindow } = require('electron')
const path = require('path')

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'FinanceApp',
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
```

- [ ] **Step 2: Add electron-builder config to `package.json`**

Add the following top-level key to `package.json`:

```json
{
  "build": {
    "appId": "com.financeapp.personal",
    "productName": "FinanceApp",
    "directories": { "output": "dist-electron" },
    "files": ["dist/**/*", "electron/**/*"],
    "win": { "target": "nsis" },
    "mac": { "target": "dmg" }
  }
}
```

- [ ] **Step 3: Test desktop app in dev mode**

```bash
npm run electron:dev
```

Expected: Vite dev server starts, then Electron window opens showing the app. All pages should work the same as in the browser.

- [ ] **Step 4: Test production build (optional)**

```bash
npm run electron:build
```

Expected: `dist-electron/` folder created with an installer.

- [ ] **Step 5: Commit**

```bash
git add electron/ package.json
git commit -m "feat: Electron desktop wrapper for Windows/Mac"
```

---

## Task 14: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: all tests pass with no errors

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Manual smoke test — web**

```bash
npm run dev
```

Walk through:
1. Open `http://localhost:5173` → redirects to `/login`
2. Log in → lands on Dashboard
3. Add a category (Despesa, Alimentação)
4. Add a transaction (linked to that category)
5. Confirm Dashboard cards and chart update
6. Check Relatórios → filter by month → export CSV
7. Add a Meta → verify progress bar
8. Log out → confirms redirect to login

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "chore: final verification — all tests pass, app functional end-to-end"
```
