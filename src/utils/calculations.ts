import type { Transaction, Goal, MonthlyTotals, CategoryTotal } from '../types'

export function calculateBalance(transactions: Transaction[]): number {
  return transactions.reduce(
    (acc, t) => (t.type === 'income' ? acc + t.amount : acc - t.amount),
    0,
  )
}

export function parseDateLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function filterCurrentMonth(transactions: Transaction[]): Transaction[] {
  const now = new Date()
  return transactions.filter(t => {
    const d = parseDateLocal(t.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
}

export function calculateCurrentMonthTotals(transactions: Transaction[]): { income: number; expense: number } {
  const filtered = filterCurrentMonth(transactions)
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
      const td = parseDateLocal(t.date)
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
    .filter(t => t.type === 'expense')
    .forEach(t => {
      if (t.categories) {
        const cat = t.categories
        const existing = map.get(cat.id)
        if (existing) {
          existing.value += t.amount
        } else {
          map.set(cat.id, { name: cat.name, value: t.amount, color: cat.color })
        }
      } else {
        // Expense whose category was deleted (ON DELETE SET NULL) — grouped into fallback bucket
        const existing = map.get('__uncategorized__')
        if (existing) {
          existing.value += t.amount
        } else {
          map.set('__uncategorized__', { name: 'Sem categoria', value: t.amount, color: '#9ca3af' })
        }
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
  // deadline is a DATE column ("YYYY-MM-DD") — parse as local midnight to avoid UTC off-by-one
  // created_at is a TIMESTAMPTZ column (full ISO string with tz) — new Date() is correct here
  const deadline = parseDateLocal(goal.deadline).getTime()
  const created = new Date(goal.created_at).getTime()
  const daysLeft = Math.floor((deadline - now) / (1000 * 60 * 60 * 24))
  if (daysLeft <= 0) return goal.current < goal.target
  const totalDays = (deadline - created) / (1000 * 60 * 60 * 24)
  const expectedProgress = totalDays > 0 ? 1 - daysLeft / totalDays : 1
  const actualProgress = goal.target > 0 ? goal.current / goal.target : 1
  return daysLeft <= 30 && actualProgress < expectedProgress
}
