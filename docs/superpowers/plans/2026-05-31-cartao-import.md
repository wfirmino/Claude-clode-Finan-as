# Cartão + Importação OFX/CSV — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar página Cartão com suporte a múltiplos cartões de crédito, importação de extratos OFX/CSV e visualização de fatura com barra de progresso.

**Architecture:** Nova página `/cartao` independente; tabela `cards` no Supabase; transações de cartão usam `perfil='cartao'` + `card_id`; parsers OFX/CSV em `src/utils/importers.ts`; toggle nos Relatórios para evitar dupla contagem.

**Tech Stack:** React 18, TypeScript, Supabase (PostgreSQL + RLS), Tailwind CSS, Vite, Vitest + Testing Library.

---

## Task 1: Migrações do banco de dados

**Files:**
- Create: `supabase/migrations/012_cards_table.sql`
- Create: `supabase/migrations/013_card_id_on_transactions.sql`

- [ ] **Step 1: Criar migration da tabela cards**

Crie `supabase/migrations/012_cards_table.sql`:
```sql
CREATE TABLE public.cards (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  due_day    int  NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  color      text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cards_owner" ON public.cards
  FOR ALL USING (user_id = auth.uid());
```

- [ ] **Step 2: Criar migration da coluna card_id**

Crie `supabase/migrations/013_card_id_on_transactions.sql`:
```sql
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS card_id uuid
  REFERENCES public.cards(id) ON DELETE SET NULL;
```

- [ ] **Step 3: Aplicar as migrations no Supabase**

Execute no painel SQL do Supabase (Dashboard → SQL Editor) ou via CLI:
```bash
supabase db push
```
Verifique que a tabela `cards` aparece no Table Editor e que `transactions` tem a coluna `card_id`.

- [ ] **Step 4: Commit**
```bash
git add supabase/migrations/012_cards_table.sql supabase/migrations/013_card_id_on_transactions.sql
git commit -m "feat: migrations tabela cards e coluna card_id em transactions"
```

---

## Task 2: Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Escrever o teste de tipo (verificação estática)**

Crie `tests/types/cards.test.ts`:
```typescript
import { describe, it, expectTypeOf } from 'vitest'
import type { Card, Transaction, Perfil } from '../../src/types'

describe('Card type', () => {
  it('Card has required fields', () => {
    expectTypeOf<Card>().toHaveProperty('id')
    expectTypeOf<Card>().toHaveProperty('name')
    expectTypeOf<Card>().toHaveProperty('due_day')
    expectTypeOf<Card>().toHaveProperty('color')
  })

  it('Perfil includes cartao', () => {
    const p: Perfil = 'cartao'
    expectTypeOf(p).toMatchTypeOf<Perfil>()
  })

  it('Transaction has optional card_id', () => {
    expectTypeOf<Transaction>().toHaveProperty('card_id')
  })
})
```

- [ ] **Step 2: Rodar o teste para ver falhar**
```bash
npx vitest run tests/types/cards.test.ts
```
Esperado: FAIL — `Card`, `Perfil='cartao'` e `card_id` não existem.

- [ ] **Step 3: Atualizar src/types/index.ts**

```typescript
// Adicionar interface Card antes de EmpresarialConfig:
export interface Card {
  id: string
  user_id: string
  name: string
  due_day: number        // 1-31
  color: string
  created_at: string
}

// Alterar Perfil:
export type Perfil = 'pessoal' | 'empresarial' | 'kommo' | 'cartao'

// Adicionar card_id em Transaction (após forma_pagamento):
  card_id?: string | null
```

- [ ] **Step 4: Rodar o teste**
```bash
npx vitest run tests/types/cards.test.ts
```
Esperado: PASS.

- [ ] **Step 5: Verificar TypeScript**
```bash
npx tsc --noEmit
```
Esperado: sem erros.

- [ ] **Step 6: Commit**
```bash
git add src/types/index.ts tests/types/cards.test.ts
git commit -m "feat: tipos Card, Perfil cartao e card_id em Transaction"
```

---

## Task 3: Hook useCards

**Files:**
- Create: `src/hooks/useCards.ts`
- Create: `tests/hooks/useCards.test.ts`

- [ ] **Step 1: Escrever os testes**

Crie `tests/hooks/useCards.test.ts`:
```typescript
import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
    },
    from: vi.fn(),
  },
}))

import { supabase } from '../../src/lib/supabase'
import { useCards } from '../../src/hooks/useCards'

const mockCards = [
  { id: 'c1', user_id: 'u1', name: 'Nubank', due_day: 10, color: '#8b5cf6', created_at: '' },
  { id: 'c2', user_id: 'u1', name: 'Itaú', due_day: 15, color: '#6366f1', created_at: '' },
]

function mockFrom() {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: mockCards, error: null }),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
  }
  vi.mocked(supabase.from).mockReturnValue(chain as any)
  return chain
}

describe('useCards', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches cards on mount', async () => {
    mockFrom()
    const { result } = renderHook(() => useCards())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.cards).toHaveLength(2)
    expect(result.current.cards[0].name).toBe('Nubank')
  })

  it('createCard inserts with user_id', async () => {
    const chain = mockFrom()
    const { result } = renderHook(() => useCards())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.createCard({ name: 'Bradesco', due_day: 5, color: '#ef4444' })
    })
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', name: 'Bradesco', due_day: 5 })
    )
  })

  it('deleteCard calls delete with card id', async () => {
    const chain = mockFrom()
    const { result } = renderHook(() => useCards())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.deleteCard('c1') })
    expect(chain.delete).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**
```bash
npx vitest run tests/hooks/useCards.test.ts
```
Esperado: FAIL — `useCards` não existe.

- [ ] **Step 3: Criar src/hooks/useCards.ts**

```typescript
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Card } from '../types'

type CardInput = Pick<Card, 'name' | 'due_day' | 'color'>

export function useCards() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) { setError(error.message); setLoading(false); return }
    setCards(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function createCard(values: CardInput) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')
    const { error } = await supabase.from('cards').insert({ ...values, user_id: user.id })
    if (error) throw error
    await fetchAll()
  }

  async function updateCard(id: string, values: CardInput) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')
    const { error } = await supabase.from('cards').update(values).eq('id', id).eq('user_id', user.id)
    if (error) throw error
    await fetchAll()
  }

  async function deleteCard(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')
    const { error } = await supabase.from('cards').delete().eq('id', id).eq('user_id', user.id)
    if (error) throw error
    await fetchAll()
  }

  return { cards, loading, error, createCard, updateCard, deleteCard, refetch: fetchAll }
}
```

- [ ] **Step 4: Rodar testes**
```bash
npx vitest run tests/hooks/useCards.test.ts
```
Esperado: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/hooks/useCards.ts tests/hooks/useCards.test.ts
git commit -m "feat: hook useCards com CRUD de cartoes"
```

---

## Task 4: bulkCreateTransactions no useTransactions

**Files:**
- Modify: `src/hooks/useTransactions.ts`
- Modify: `tests/hooks/useTransactions.test.ts` (se existir) ou criar novo teste

- [ ] **Step 1: Escrever o teste**

Crie `tests/hooks/bulkCreate.test.ts`:
```typescript
import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: vi.fn(),
  },
}))

import { supabase } from '../../src/lib/supabase'
import { useTransactions } from '../../src/hooks/useTransactions'

function mockFrom() {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    then: (r: (v: unknown) => void) => Promise.resolve({ data: [], error: null, count: 0 }).then(r),
  }
  vi.mocked(supabase.from).mockReturnValue(chain as any)
  return chain
}

describe('bulkCreateTransactions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('inserts all rows in a single call and calls fetchAll once', async () => {
    const chain = mockFrom()
    const { result } = renderHook(() => useTransactions())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const rows = [
      { title: 'Compra A', amount: 100, type: 'expense' as const, date: '2026-05-01', perfil: 'cartao' as const, card_id: 'card1', category_id: null, notes: null },
      { title: 'Compra B', amount: 200, type: 'expense' as const, date: '2026-05-02', perfil: 'cartao' as const, card_id: 'card1', category_id: null, notes: null },
    ]
    await act(async () => { await result.current.bulkCreateTransactions(rows) })
    expect(chain.insert).toHaveBeenCalledTimes(1)
    expect(chain.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Compra A', user_id: 'u1' }),
        expect.objectContaining({ title: 'Compra B', user_id: 'u1' }),
      ])
    )
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**
```bash
npx vitest run tests/hooks/bulkCreate.test.ts
```
Esperado: FAIL — `bulkCreateTransactions` não existe.

- [ ] **Step 3: Adicionar bulkCreateTransactions em useTransactions.ts**

Adicione antes do `return` final em `src/hooks/useTransactions.ts`:
```typescript
  async function bulkCreateTransactions(
    rows: Array<Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'categories'>>
  ) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')
    const { error } = await supabase
      .from('transactions')
      .insert(rows.map(r => ({ ...r, user_id: user.id })))
    if (error) throw error
    await fetchAll()
  }
```

E inclua `bulkCreateTransactions` no objeto retornado:
```typescript
  return { transactions, totalCount, loading, error, createTransaction, updateTransaction, deleteTransaction, bulkCreateTransactions, refetch: fetchAll }
```

- [ ] **Step 4: Rodar testes**
```bash
npx vitest run tests/hooks/bulkCreate.test.ts
```
Esperado: PASS.

- [ ] **Step 5: Verificar TypeScript**
```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**
```bash
git add src/hooks/useTransactions.ts tests/hooks/bulkCreate.test.ts
git commit -m "feat: bulkCreateTransactions para importacao em lote"
```

---

## Task 5: Parsers OFX e CSV

**Files:**
- Create: `src/utils/importers.ts`
- Create: `tests/utils/importers.test.ts`

- [ ] **Step 1: Escrever os testes**

Crie `tests/utils/importers.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { parseOFX, parseCSV } from '../../src/utils/importers'

const OFX_SGML = `
OFXHEADER:100
DATA:OFXSGML

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260501120000
<TRNAMT>-150.00
<FITID>001
<MEMO>SUPERMERCADO ABC
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260510
<TRNAMT>1240.00
<FITID>002
<MEMO>PAGAMENTO RECEBIDO
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`

const OFX_XML = `
<OFX>
<BANKTRANLIST>
<STMTTRN>
  <TRNTYPE>DEBIT</TRNTYPE>
  <DTPOSTED>20260515</DTPOSTED>
  <TRNAMT>-89.90</TRNAMT>
  <MEMO>NETFLIX</MEMO>
</STMTTRN>
</BANKTRANLIST>
</OFX>
`

const CSV_NUBANK = `Data,Descrição,Valor
2026-05-15,Supermercado,-150.0
2026-05-10,Pagamento,1240.0
`

const CSV_BR = `Data;Histórico;Valor
15/05/2026;SUPERMERCADO;-150,00
10/05/2026;PAGAMENTO RECEBIDO;1.240,00
`

describe('parseOFX', () => {
  it('parses SGML OFX with two transactions', () => {
    const txs = parseOFX(OFX_SGML)
    expect(txs).toHaveLength(2)
    expect(txs[0]).toMatchObject({ date: '2026-05-01', amount: 150, type: 'expense', description: 'SUPERMERCADO ABC' })
    expect(txs[1]).toMatchObject({ date: '2026-05-10', amount: 1240, type: 'income', description: 'PAGAMENTO RECEBIDO' })
  })

  it('parses XML OFX', () => {
    const txs = parseOFX(OFX_XML)
    expect(txs).toHaveLength(1)
    expect(txs[0]).toMatchObject({ date: '2026-05-15', amount: 89.9, type: 'expense' })
  })

  it('returns empty array for invalid content', () => {
    expect(parseOFX('not ofx content')).toHaveLength(0)
  })
})

describe('parseCSV', () => {
  it('parses Nubank CSV (comma delimiter, ISO date)', () => {
    const txs = parseCSV(CSV_NUBANK)
    expect(txs).toHaveLength(2)
    expect(txs[0]).toMatchObject({ date: '2026-05-15', amount: 150, type: 'expense' })
    expect(txs[1]).toMatchObject({ date: '2026-05-10', amount: 1240, type: 'income' })
  })

  it('parses BR CSV (semicolon delimiter, DD/MM/YYYY date, PT-BR amount)', () => {
    const txs = parseCSV(CSV_BR)
    expect(txs).toHaveLength(2)
    expect(txs[0]).toMatchObject({ date: '2026-05-15', amount: 150, type: 'expense' })
    expect(txs[1]).toMatchObject({ date: '2026-05-10', amount: 1240, type: 'income' })
  })

  it('returns empty array for empty content', () => {
    expect(parseCSV('')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**
```bash
npx vitest run tests/utils/importers.test.ts
```
Esperado: FAIL — módulo não existe.

- [ ] **Step 3: Criar src/utils/importers.ts**

```typescript
export interface ImportedTransaction {
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
}

// ─── OFX ────────────────────────────────────────────────────────────────────

function getOFXField(block: string, tag: string): string | null {
  const xmlRe = new RegExp(`<${tag}>([^<]+)</${tag}>`, 'i')
  const sgmlRe = new RegExp(`<${tag}>([^\n<]+)`, 'i')
  return (block.match(xmlRe) ?? block.match(sgmlRe))?.[1]?.trim() ?? null
}

function ofxDateToISO(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 8) return null
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
}

export function parseOFX(content: string): ImportedTransaction[] {
  const results: ImportedTransaction[] = []
  // Suporta XML (<STMTTRN>...</STMTTRN>) e SGML (próximo <STMTTRN> termina o anterior)
  const xmlBlocks = [...content.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)].map(m => m[0])
  const sgmlBlocks = content.includes('</STMTTRN>')
    ? xmlBlocks
    : content.split(/<STMTTRN>/i).slice(1).map(b => `<STMTTRN>${b}`)

  for (const block of sgmlBlocks.length ? sgmlBlocks : xmlBlocks) {
    const dateRaw = getOFXField(block, 'DTPOSTED')
    const amountRaw = getOFXField(block, 'TRNAMT')
    const memo = getOFXField(block, 'MEMO') ?? getOFXField(block, 'NAME') ?? 'Importado'
    if (!dateRaw || !amountRaw) continue
    const date = ofxDateToISO(dateRaw)
    if (!date) continue
    const amount = parseFloat(amountRaw.replace(',', '.'))
    if (isNaN(amount) || amount === 0) continue
    results.push({
      date,
      description: memo.trim(),
      amount: Math.abs(amount),
      type: amount >= 0 ? 'income' : 'expense',
    })
  }
  return results
}

// ─── CSV ────────────────────────────────────────────────────────────────────

function detectDelimiter(line: string): string {
  const counts: Record<string, number> = { ';': 0, ',': 0, '\t': 0 }
  for (const ch of line) if (ch in counts) counts[ch]++
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

function parseAnyDate(s: string): string | null {
  const t = s.trim()
  const dmy = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  const ymd = t.match(/^(\d{4})\/(\d{2})\/(\d{2})$/)
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`
  return null
}

function parseAnyAmount(s: string): number | null {
  if (!s?.trim()) return null
  const clean = s.trim().replace(/R\$\s*/g, '').trim()
  if (clean.includes(',') && clean.includes('.')) {
    const v = clean.lastIndexOf(',') > clean.lastIndexOf('.')
      ? parseFloat(clean.replace(/\./g, '').replace(',', '.'))
      : parseFloat(clean.replace(/,/g, ''))
    return isNaN(v) ? null : v
  }
  if (clean.includes(',')) { const v = parseFloat(clean.replace(',', '.')); return isNaN(v) ? null : v }
  const v = parseFloat(clean.replace(/[^\d.\-]/g, ''))
  return isNaN(v) ? null : v
}

function colIdx(headers: string[], keywords: string[]): number {
  const lc = headers.map(h => h.toLowerCase().trim())
  for (const kw of keywords) { const i = lc.findIndex(h => h.includes(kw)); if (i >= 0) return i }
  return -1
}

export function parseCSV(content: string): ImportedTransaction[] {
  const lines = content.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const delim = detectDelimiter(lines[0])
  const headers = lines[0].split(delim).map(h => h.replace(/^["']|["']$/g, '').trim())

  const dateCol = colIdx(headers, ['data', 'date', 'dt '])
  const descCol = colIdx(headers, ['histórico', 'historico', 'descrição', 'descricao', 'description', 'memo', 'lançamento', 'lancamento'])
  const amtCol  = colIdx(headers, ['valor', 'value', 'amount', 'quantia'])
  const debCol  = colIdx(headers, ['débito', 'debito', 'debit', 'saída', 'saida'])
  const creCol  = colIdx(headers, ['crédito', 'credito', 'credit', 'entrada'])

  if (dateCol < 0) return []

  const results: ImportedTransaction[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delim).map(c => c.replace(/^["']|["']$/g, '').trim())
    if (cells.length < 2) continue
    const date = parseAnyDate(cells[dateCol] ?? '')
    if (!date) continue
    const desc = cells[descCol >= 0 ? descCol : 1] ?? 'Importado'

    let amount: number | null = null
    let type: 'income' | 'expense' = 'expense'

    if (amtCol >= 0 && cells[amtCol]) {
      amount = parseAnyAmount(cells[amtCol])
      if (amount !== null) { type = amount >= 0 ? 'income' : 'expense'; amount = Math.abs(amount) }
    } else if (debCol >= 0 || creCol >= 0) {
      const deb = debCol >= 0 ? parseAnyAmount(cells[debCol] ?? '') : null
      const cre = creCol >= 0 ? parseAnyAmount(cells[creCol] ?? '') : null
      if (cre && Math.abs(cre) > 0) { amount = Math.abs(cre); type = 'income' }
      else if (deb && Math.abs(deb) > 0) { amount = Math.abs(deb); type = 'expense' }
    }

    if (!amount || amount <= 0) continue
    results.push({ date, description: desc.trim(), amount, type })
  }
  return results
}
```

- [ ] **Step 4: Rodar testes**
```bash
npx vitest run tests/utils/importers.test.ts
```
Esperado: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/utils/importers.ts tests/utils/importers.test.ts
git commit -m "feat: parsers OFX (SGML+XML) e CSV multi-banco"
```

---

## Task 6: Componente ImportModal

**Files:**
- Create: `src/components/ImportModal.tsx`
- Create: `tests/components/ImportModal.test.tsx`

- [ ] **Step 1: Escrever o teste**

Crie `tests/components/ImportModal.test.tsx`:
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import ImportModal from '../../src/components/ImportModal'

const mockOnImport = vi.fn().mockResolvedValue(undefined)
const mockOnClose = vi.fn()

describe('ImportModal', () => {
  it('renders upload area when open', () => {
    render(<ImportModal open={true} cardName="Nubank" onClose={mockOnClose} onImport={mockOnImport} />)
    expect(screen.getByText(/Importar para Nubank/i)).toBeInTheDocument()
    expect(screen.getByText(/Arraste e solte/i)).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<ImportModal open={false} cardName="Nubank" onClose={mockOnClose} onImport={mockOnImport} />)
    expect(screen.queryByText(/Importar para Nubank/i)).not.toBeInTheDocument()
  })

  it('shows parsed transactions after CSV file upload', async () => {
    render(<ImportModal open={true} cardName="Nubank" onClose={mockOnClose} onImport={mockOnImport} />)
    const csv = 'Data,Descrição,Valor\n2026-05-15,Netflix,-44.90\n2026-05-10,Pagamento,1240.00'
    const file = new File([csv], 'extrato.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => {
      expect(screen.getByText('Netflix')).toBeInTheDocument()
      expect(screen.getByText('Pagamento')).toBeInTheDocument()
    })
  })

  it('calls onImport with selected transactions', async () => {
    render(<ImportModal open={true} cardName="Nubank" onClose={mockOnClose} onImport={mockOnImport} />)
    const csv = 'Data,Descrição,Valor\n2026-05-15,Netflix,-44.90'
    const file = new File([csv], 'extrato.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => screen.getByText('Netflix'))
    fireEvent.click(screen.getByRole('button', { name: /importar 1/i }))
    await waitFor(() => {
      expect(mockOnImport).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ title: 'Netflix', type: 'expense' })])
      )
    })
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**
```bash
npx vitest run tests/components/ImportModal.test.tsx
```
Esperado: FAIL — componente não existe.

- [ ] **Step 3: Criar src/components/ImportModal.tsx**

```typescript
import { useState } from 'react'
import { parseOFX, parseCSV, type ImportedTransaction } from '../utils/importers'
import { formatCurrency, formatDate } from '../utils/formatters'
import Modal from './Modal'

interface Props {
  open: boolean
  cardName: string
  onClose: () => void
  onImport: (rows: Array<{
    title: string; amount: number; type: 'income' | 'expense'
    date: string; perfil: 'cartao'; card_id: string
    category_id: null; notes: null
  }>, cardId: string) => Promise<void>
  cardId?: string
}

export default function ImportModal({ open, cardName, onClose, onImport, cardId = '' }: Props) {
  const [parsed, setParsed] = useState<ImportedTransaction[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')

  function reset() { setParsed([]); setSelected(new Set()); setError(null); setFileName('') }

  function handleFile(file: File) {
    setError(null)
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const content = e.target?.result as string
      const txs = file.name.toLowerCase().endsWith('.ofx') ? parseOFX(content) : parseCSV(content)
      if (txs.length === 0) { setError('Nenhuma transação encontrada. Verifique se o formato é suportado.'); return }
      setParsed(txs)
      setSelected(new Set(txs.map((_, i) => i)))
    }
    reader.readAsText(file, 'ISO-8859-1')
  }

  function toggleRow(i: number) {
    const next = new Set(selected)
    next.has(i) ? next.delete(i) : next.add(i)
    setSelected(next)
  }

  function toggleAll() {
    setSelected(selected.size === parsed.length ? new Set() : new Set(parsed.map((_, i) => i)))
  }

  async function handleImport() {
    const rows = [...selected].sort((a, b) => a - b).map(i => ({
      title: parsed[i].description,
      amount: parsed[i].amount,
      type: parsed[i].type,
      date: parsed[i].date,
      perfil: 'cartao' as const,
      card_id: cardId,
      category_id: null,
      notes: null,
    }))
    setImporting(true)
    try { await onImport(rows, cardId); reset(); onClose() }
    finally { setImporting(false) }
  }

  const n = selected.size
  const plural = n !== 1 ? 'ões' : 'ão'

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} titleId="import-modal-title">
      <h3 id="import-modal-title" className="text-lg font-semibold text-gray-900 mb-4">
        Importar para {cardName}
      </h3>

      {parsed.length === 0 ? (
        <div>
          <div
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onDragOver={e => e.preventDefault()}
            onClick={() => document.getElementById('import-file-input')?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
          >
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-medium text-gray-700">Arraste e solte seu arquivo aqui</p>
            <p className="text-xs text-gray-400 mt-1">ou clique para selecionar</p>
            <p className="text-xs text-gray-400 mt-3">Suporta .ofx e .csv</p>
          </div>
          <input id="import-file-input" type="file" accept=".ofx,.csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <details className="mt-4">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">Bancos suportados</summary>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              OFX: Itaú, Bradesco, Santander, Banco do Brasil, Caixa, Nubank.<br />
              CSV: Nubank, Inter, C6, XP e outros com colunas Data, Descrição e Valor.
            </p>
          </details>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{fileName}</p>
              <p className="text-xs text-gray-400">{parsed.length} transações encontradas</p>
            </div>
            <button onClick={reset} className="text-xs text-indigo-600 hover:underline">Trocar arquivo</button>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">
                      <input type="checkbox" checked={selected.size === parsed.length} onChange={toggleAll} />
                    </th>
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">Data</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">Descrição</th>
                    <th className="px-3 py-2 text-right text-gray-500 font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {parsed.map((t, i) => (
                    <tr key={i} className={selected.has(i) ? '' : 'opacity-40'}>
                      <td className="px-3 py-2"><input type="checkbox" checked={selected.has(i)} onChange={() => toggleRow(i)} /></td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatDate(t.date)}</td>
                      <td className="px-3 py-2 text-gray-900 max-w-[180px] truncate">{t.description}</td>
                      <td className={`px-3 py-2 text-right font-medium tabular-nums whitespace-nowrap ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{n} de {parsed.length} selecionadas</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => { reset(); onClose() }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={handleImport} disabled={n === 0 || importing} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60">
                {importing ? 'Importando...' : `Importar ${n} transaç${plural}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
```

- [ ] **Step 4: Rodar testes**
```bash
npx vitest run tests/components/ImportModal.test.tsx
```
Esperado: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/components/ImportModal.tsx tests/components/ImportModal.test.tsx
git commit -m "feat: ImportModal com upload, preview e confirmacao de importacao"
```

---

## Task 7: Componente CartaoSummary

**Files:**
- Create: `src/components/CartaoSummary.tsx`
- Create: `tests/components/CartaoSummary.test.tsx`

- [ ] **Step 1: Escrever o teste**

Crie `tests/components/CartaoSummary.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import CartaoSummary from '../../src/components/CartaoSummary'
import type { Transaction } from '../../src/types'

const makeExpense = (amount: number): Transaction => ({
  id: Math.random().toString(), user_id: 'u1', category_id: null,
  title: 'Compra', amount, type: 'expense', date: '2026-05-10',
  notes: null, created_at: '', perfil: 'cartao', card_id: 'c1',
})
const makePayment = (amount: number): Transaction => ({
  id: Math.random().toString(), user_id: 'u1', category_id: null,
  title: 'Pagamento', amount, type: 'income', date: '2026-05-10',
  notes: null, created_at: '', perfil: 'cartao', card_id: 'c1',
})

describe('CartaoSummary', () => {
  it('renders fatura, pago and em aberto cards', () => {
    const txs = [makeExpense(1000), makeExpense(500), makePayment(800)]
    render(<CartaoSummary transactions={txs} dueDay={10} periodo="Maio 2026" />)
    expect(screen.getByText(/FATURA/i)).toBeInTheDocument()
    expect(screen.getByText(/PAGO/i)).toBeInTheDocument()
    expect(screen.getByText(/ABERTO/i)).toBeInTheDocument()
  })

  it('calculates fatura = sum of expenses', () => {
    const txs = [makeExpense(1000), makeExpense(500)]
    render(<CartaoSummary transactions={txs} dueDay={10} periodo="Maio 2026" />)
    expect(screen.getByText('R$ 1.500,00')).toBeInTheDocument()
  })

  it('calculates em aberto = fatura - pago', () => {
    const txs = [makeExpense(1000), makePayment(600)]
    render(<CartaoSummary transactions={txs} dueDay={10} periodo="Maio 2026" />)
    // fatura=1000, pago=600, aberto=400
    expect(screen.getByText('R$ 400,00')).toBeInTheDocument()
  })

  it('shows 100% pago when fully paid', () => {
    const txs = [makeExpense(500), makePayment(500)]
    render(<CartaoSummary transactions={txs} dueDay={10} periodo="Maio 2026" />)
    expect(screen.getByText('100% pago')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**
```bash
npx vitest run tests/components/CartaoSummary.test.tsx
```
Esperado: FAIL.

- [ ] **Step 3: Criar src/components/CartaoSummary.tsx**

```typescript
import { useMemo } from 'react'
import type { Transaction } from '../types'
import { formatCurrency } from '../utils/formatters'

interface Props {
  transactions: Transaction[]
  dueDay: number
  periodo: string
}

function getDaysUntilDue(dueDay: number): number {
  const today = new Date()
  let due = new Date(today.getFullYear(), today.getMonth(), dueDay)
  if (due < today) due = new Date(today.getFullYear(), today.getMonth() + 1, dueDay)
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function dueColor(days: number) {
  if (days <= 3) return 'text-red-600'
  if (days <= 7) return 'text-amber-500'
  return 'text-gray-500'
}

function barColor(pct: number) {
  if (pct >= 80) return 'bg-green-500'
  if (pct >= 40) return 'bg-amber-400'
  return 'bg-red-500'
}

export default function CartaoSummary({ transactions, dueDay, periodo }: Props) {
  const { fatura, pago, emAberto, compras, pagamentos } = useMemo(() => {
    const c = (n: number) => Math.round(n * 100)
    let faturaC = 0, pagoC = 0, compras = 0, pagamentos = 0
    for (const t of transactions) {
      if (t.type === 'expense') { faturaC += c(t.amount); compras++ }
      else { pagoC += c(t.amount); pagamentos++ }
    }
    return {
      fatura: faturaC / 100,
      pago: pagoC / 100,
      emAberto: Math.max(0, (faturaC - pagoC) / 100),
      compras,
      pagamentos,
    }
  }, [transactions])

  const pct = fatura > 0 ? Math.min(100, Math.round((pago / fatura) * 100)) : 0
  const daysUntil = getDaysUntilDue(dueDay)

  return (
    <div className="mb-6">
      {/* Progress bar panel */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Fatura {periodo}</span>
          <span className="text-lg font-bold text-gray-900 tabular-nums">{formatCurrency(fatura)}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
          <div className={`h-2.5 rounded-full transition-all ${barColor(pct)}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Pago: <span className="font-medium text-gray-700">{formatCurrency(pago)}</span></span>
          <span className="font-medium">{pct}% pago</span>
          <span>Em aberto: <span className="font-medium text-gray-700">{formatCurrency(emAberto)}</span></span>
        </div>
        <p className={`text-xs mt-2 ${dueColor(daysUntil)}`}>
          Vence em {daysUntil} dia{daysUntil !== 1 ? 's' : ''} (dia {dueDay})
        </p>
      </div>

      {/* 3 cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">💳 Fatura</p>
          <p className="text-xl font-bold text-indigo-700 tabular-nums">{formatCurrency(fatura)}</p>
          <p className="text-xs text-indigo-400 mt-0.5">{compras} compra{compras !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">✅ Pago</p>
          <p className="text-xl font-bold text-green-700 tabular-nums">{formatCurrency(pago)}</p>
          <p className="text-xs text-green-400 mt-0.5">{pagamentos} pagamento{pagamentos !== 1 ? 's' : ''}</p>
        </div>
        <div className={`border rounded-xl px-4 py-3 ${emAberto > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${emAberto > 0 ? 'text-red-500' : 'text-gray-400'}`}>⏳ Em aberto</p>
          <p className={`text-xl font-bold tabular-nums ${emAberto > 0 ? 'text-red-600' : 'text-gray-400'}`}>{formatCurrency(emAberto)}</p>
          <p className={`text-xs mt-0.5 ${dueColor(daysUntil)}`}>vence em {daysUntil}d</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rodar testes**
```bash
npx vitest run tests/components/CartaoSummary.test.tsx
```
Esperado: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/components/CartaoSummary.tsx tests/components/CartaoSummary.test.tsx
git commit -m "feat: CartaoSummary com barra de progresso e cards fatura/pago/aberto"
```

---

## Task 8: Página Cartao

**Files:**
- Create: `src/pages/Cartao.tsx`
- Create: `tests/pages/Cartao.test.tsx`

- [ ] **Step 1: Escrever o teste**

Crie `tests/pages/Cartao.test.tsx`:
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Cartao from '../../src/pages/Cartao'

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: vi.fn(),
  },
}))
import { supabase } from '../../src/lib/supabase'

const mockCards = [
  { id: 'c1', user_id: 'u1', name: 'Nubank', due_day: 10, color: '#8b5cf6', created_at: '' },
]
const mockTxs = [
  { id: 't1', user_id: 'u1', category_id: null, title: 'Netflix', amount: 44.9, type: 'expense', date: '2026-05-14', notes: null, created_at: '', perfil: 'cartao', card_id: 'c1' },
]

function mockFrom(table: string) {
  const cardsData = mockCards
  const txsData = mockTxs
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockImplementation(() => {
      return Promise.resolve({ data: table === 'cards' ? cardsData : txsData, error: null, count: txsData.length })
    }),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    then: (r: (v: unknown) => void) => Promise.resolve({ data: table === 'cards' ? cardsData : txsData, error: null, count: txsData.length }).then(r),
  }
  return chain
}

describe('Cartao page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabase.from).mockImplementation((table: string) => mockFrom(table) as any)
  })

  it('shows empty state when no cards', async () => {
    vi.mocked(supabase.from).mockImplementation(() => {
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: (r: (v: unknown) => void) => Promise.resolve({ data: [], error: null, count: 0 }).then(r),
      }
      return chain as any
    })
    render(<MemoryRouter><Cartao /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/Nenhum cartão cadastrado/i)).toBeInTheDocument())
  })

  it('shows card tab and transactions when cards exist', async () => {
    render(<MemoryRouter><Cartao /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Nubank')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText('Netflix')).toBeInTheDocument())
  })

  it('opens new card modal on click', async () => {
    render(<MemoryRouter><Cartao /></MemoryRouter>)
    await waitFor(() => screen.getByText('Nubank'))
    fireEvent.click(screen.getByRole('button', { name: /novo cartão/i }))
    expect(screen.getByRole('heading', { name: /novo cartão/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar para ver falhar**
```bash
npx vitest run tests/pages/Cartao.test.tsx
```
Esperado: FAIL.

- [ ] **Step 3: Criar src/pages/Cartao.tsx**

```typescript
import { useState, useMemo } from 'react'
import { useCards } from '../hooks/useCards'
import { useTransactions } from '../hooks/useTransactions'
import type { Card } from '../types'
import { formatCurrency, formatDate, maskCurrency, parseBR } from '../utils/formatters'
import { getErrorMessage } from '../utils/errors'
import CartaoSummary from '../components/CartaoSummary'
import ImportModal from '../components/ImportModal'
import Modal from '../components/Modal'
import Toast from '../components/Toast'

const CARD_COLORS = ['#8b5cf6', '#6366f1', '#ec4899', '#ef4444', '#f59e0b', '#10b981']

interface CardForm { name: string; due_day: string; color: string }
const defaultCardForm: CardForm = { name: '', due_day: '', color: '#8b5cf6' }

export default function Cartao() {
  const { cards, loading: cardsLoading, createCard, updateCard, deleteCard } = useCards()
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const activeCard = cards.find(c => c.id === (activeCardId ?? cards[0]?.id)) ?? cards[0] ?? null

  const { transactions, bulkCreateTransactions } = useTransactions(
    activeCard ? { perfil: 'cartao' } : {}
  )
  const cardTxs = useMemo(
    () => transactions.filter(t => t.card_id === activeCard?.id),
    [transactions, activeCard]
  )

  const [cardModal, setCardModal] = useState<{ open: boolean; editing: Card | null }>({ open: false, editing: null })
  const [cardForm, setCardForm] = useState<CardForm>(defaultCardForm)
  const [importOpen, setImportOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' } | null>(null)
  const toastCounter = { current: 0 }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ id: ++toastCounter.current, message, type })
  }

  function openCreate() { setCardForm(defaultCardForm); setCardModal({ open: true, editing: null }) }
  function openEdit(c: Card) {
    setCardForm({ name: c.name, due_day: String(c.due_day), color: c.color })
    setCardModal({ open: true, editing: c })
  }

  async function handleCardSubmit(e: React.FormEvent) {
    e.preventDefault()
    const due = parseInt(cardForm.due_day)
    if (isNaN(due) || due < 1 || due > 31) { showToast('Dia de vencimento inválido (1–31).', 'error'); return }
    if (!cardForm.name.trim()) { showToast('Informe o nome do cartão.', 'error'); return }
    if (submitting) return
    setSubmitting(true)
    try {
      const values = { name: cardForm.name.trim(), due_day: due, color: cardForm.color }
      if (cardModal.editing) {
        await updateCard(cardModal.editing.id, values)
        showToast('Cartão atualizado.', 'success')
      } else {
        await createCard(values)
        showToast('Cartão adicionado.', 'success')
      }
      setCardModal({ open: false, editing: null })
    } catch (err) { showToast(getErrorMessage(err), 'error') }
    finally { setSubmitting(false) }
  }

  async function handleDelete(id: string) {
    setConfirmDelete(null)
    try { await deleteCard(id); showToast('Cartão excluído.', 'success') }
    catch (err) { showToast(getErrorMessage(err), 'error') }
  }

  async function handleImport(rows: Parameters<typeof bulkCreateTransactions>[0]) {
    await bulkCreateTransactions(rows)
    showToast(`${rows.length} transação(ões) importada(s).`, 'success')
  }

  const selectedMes = useMemo(() => {
    const d = new Date()
    return d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
  }, [])

  if (cardsLoading) return <p className="text-sm text-gray-400">Carregando...</p>

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Cartões</h2>
        <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          + Novo Cartão
        </button>
      </div>

      {/* Empty state */}
      {cards.length === 0 && (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">💳</p>
          <p className="text-gray-500 font-medium mb-1">Nenhum cartão cadastrado.</p>
          <p className="text-sm text-gray-400 mb-6">Adicione um cartão para importar extratos e controlar faturas.</p>
          <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
            + Adicionar cartão
          </button>
        </div>
      )}

      {/* Card tabs + content */}
      {cards.length > 0 && (
        <>
          {/* Tab bar */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
            {cards.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCardId(c.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeCard?.id === c.id ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                style={activeCard?.id === c.id ? { backgroundColor: c.color } : {}}
              >
                <span className="w-2 h-2 rounded-full bg-current opacity-70" />
                {c.name}
              </button>
            ))}
            <button
              onClick={openCreate}
              className="flex-shrink-0 px-3 py-2 rounded-full text-sm text-gray-400 hover:bg-gray-100 border border-dashed border-gray-300"
            >
              + Novo
            </button>
            <div className="ml-auto flex-shrink-0">
              <button
                onClick={() => setImportOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Importar
              </button>
            </div>
          </div>

          {/* Card actions */}
          {activeCard && (
            <div className="flex items-center justify-end gap-3 mb-4 text-sm">
              <button onClick={() => openEdit(activeCard)} className="text-indigo-600 hover:underline">Editar</button>
              {confirmDelete === activeCard.id ? (
                <>
                  <span className="text-gray-500">Excluir cartão e todas as transações?</span>
                  <button onClick={() => handleDelete(activeCard.id)} className="text-red-600 font-medium hover:underline">Sim</button>
                  <button onClick={() => setConfirmDelete(null)} className="text-gray-500 hover:underline">Não</button>
                </>
              ) : (
                <button onClick={() => setConfirmDelete(activeCard.id)} className="text-red-500 hover:underline">Excluir</button>
              )}
            </div>
          )}

          {/* Summary */}
          {activeCard && (
            <CartaoSummary transactions={cardTxs} dueDay={activeCard.due_day} periodo={selectedMes} />
          )}

          {/* Transaction list */}
          <div className="space-y-2">
            {cardTxs.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">
                Nenhuma transação. Importe um extrato para começar.
              </p>
            )}
            {cardTxs.map(t => (
              <div key={t.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`text-lg ${t.type === 'income' ? '✅' : '🛍️'}`}>
                    {t.type === 'income' ? '✅' : '🛍️'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t.title}</p>
                    <p className="text-xs text-gray-400">{formatDate(t.date)}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold tabular-nums ${t.type === 'income' ? 'text-green-600' : 'text-gray-800'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal: novo/editar cartão */}
      <Modal open={cardModal.open} onClose={() => setCardModal({ open: false, editing: null })} titleId="card-modal-title">
        <h3 id="card-modal-title" className="text-lg font-semibold text-gray-900 mb-4">
          {cardModal.editing ? 'Editar Cartão' : 'Novo Cartão'}
        </h3>
        <form onSubmit={handleCardSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do cartão</label>
            <input
              type="text" required placeholder="Ex: Nubank, Itaú Platinum"
              value={cardForm.name}
              onChange={e => setCardForm(f => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dia de vencimento</label>
            <input
              type="number" required min={1} max={31} placeholder="Ex: 10"
              value={cardForm.due_day}
              onChange={e => setCardForm(f => ({ ...f, due_day: e.target.value }))}
              className="w-full rounded-lg border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cor</label>
            <div className="flex gap-2">
              {CARD_COLORS.map(color => (
                <button
                  key={color} type="button"
                  onClick={() => setCardForm(f => ({ ...f, color }))}
                  className={`w-8 h-8 rounded-full transition-transform ${cardForm.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setCardModal({ open: false, editing: null })} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60">
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Import modal */}
      {activeCard && (
        <ImportModal
          open={importOpen}
          cardName={activeCard.name}
          cardId={activeCard.id}
          onClose={() => setImportOpen(false)}
          onImport={async (rows) => {
            await handleImport(rows as any)
            setImportOpen(false)
          }}
        />
      )}

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
```

- [ ] **Step 4: Rodar testes**
```bash
npx vitest run tests/pages/Cartao.test.tsx
```
Esperado: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/pages/Cartao.tsx tests/pages/Cartao.test.tsx
git commit -m "feat: pagina Cartao com abas, resumo e lista de transacoes"
```

---

## Task 9: Rota e navegação

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/TopNav.tsx`

- [ ] **Step 1: Adicionar rota em src/App.tsx**

```typescript
// Adicionar import:
import Cartao from './pages/Cartao'

// Adicionar rota após /transactions:
<Route path="/cartao" element={<Cartao />} />
```

O arquivo completo de App.tsx fica:
```typescript
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Cartao from './pages/Cartao'
import Installments from './pages/Installments'
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
```

- [ ] **Step 2: Adicionar item no menu em src/components/TopNav.tsx**

```typescript
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

- [ ] **Step 3: Verificar TypeScript**
```bash
npx tsc --noEmit
```
Esperado: sem erros.

- [ ] **Step 4: Rodar todos os testes**
```bash
npx vitest run
```
Esperado: todos passando.

- [ ] **Step 5: Commit**
```bash
git add src/App.tsx src/components/TopNav.tsx
git commit -m "feat: rota /cartao e item no menu de navegacao"
```

---

## Task 10: Toggle nos Relatórios

**Files:**
- Modify: `src/pages/Reports.tsx`

- [ ] **Step 1: Adicionar estado do toggle**

No topo do componente `Reports`, após os outros `useState`:
```typescript
const [includeCards, setIncludeCards] = useState(false)
```

- [ ] **Step 2: Adicionar segundo hook de transações para cartões (quando toggle ativo)**

Após o hook existente `const { transactions, loading, error } = useTransactions(filters)`:
```typescript
const cardFilters = useMemo<TransactionFilters>(() => ({
  ...filters,
  perfil: 'cartao',
}), [filters])
const { transactions: cardTxs } = useTransactions(includeCards ? cardFilters : { perfil: 'cartao', startDate: 'never' })

const allTransactions = useMemo(
  () => includeCards ? [...transactions, ...cardTxs] : transactions,
  [transactions, cardTxs, includeCards]
)
```

- [ ] **Step 3: Substituir `transactions` por `allTransactions` nos cálculos**

Troque as referências de `transactions` por `allTransactions` nas linhas de `categoryTotals`, `totalExpense` e `totalIncome`:
```typescript
const categoryTotals = useMemo(() => calculateCategoryTotals(allTransactions), [allTransactions])
const totalExpense = useMemo(() => allTransactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0), [allTransactions])
const totalIncome  = useMemo(() => allTransactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0), [allTransactions])
```

- [ ] **Step 4: Adicionar UI do toggle antes do seletor de período**

Adicione logo abaixo do `<h2>Relatórios</h2>`:
```tsx
{/* Toggle cartão */}
<div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
  <label className="flex items-center gap-2 cursor-pointer select-none">
    <div className="relative">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={includeCards}
        onChange={e => setIncludeCards(e.target.checked)}
      />
      <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 transition-colors" />
      <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
    </div>
    <span className="text-sm font-medium text-gray-700">Incluir transações de cartão</span>
  </label>
  {includeCards && (
    <p className="text-xs text-amber-600">
      ⚠️ Pode duplicar valores se o pagamento da fatura já está em Pessoal.
    </p>
  )}
</div>
```

- [ ] **Step 5: Passar `allTransactions` para exportCSV**

Encontre `exportTransactionsToCSV(transactions)` e troque por `exportTransactionsToCSV(allTransactions)`.

- [ ] **Step 6: Verificar TypeScript**
```bash
npx tsc --noEmit
```

- [ ] **Step 7: Rodar todos os testes**
```bash
npx vitest run
```
Esperado: todos passando.

- [ ] **Step 8: Commit**
```bash
git add src/pages/Reports.tsx
git commit -m "feat: toggle para incluir transacoes de cartao nos relatorios"
```

---

## Task 11: Push final e deploy

- [ ] **Step 1: Rodar suite completa**
```bash
npx vitest run
```
Esperado: 100% passando.

- [ ] **Step 2: Verificar TypeScript**
```bash
npx tsc --noEmit
```
Esperado: sem erros.

- [ ] **Step 3: Push**
```bash
git push origin main
```

- [ ] **Step 4: Aplicar migrations no Supabase**

Acesse o SQL Editor do Supabase e execute em ordem:
1. Conteúdo de `supabase/migrations/012_cards_table.sql`
2. Conteúdo de `supabase/migrations/013_card_id_on_transactions.sql`

- [ ] **Step 5: Redeploy no Coolify**

Acione o redeploy no painel do Coolify após o push.

- [ ] **Step 6: Verificar no browser**

Acesse `/cartao` e confirme:
- Menu "💳 Cartão" aparece na navegação
- Estado vazio exibe mensagem e botão
- Modal de novo cartão abre corretamente
- Após criar cartão, abas aparecem
- Botão "Importar" abre o ImportModal
- Upload de arquivo CSV/OFX mostra preview
- Confirmar importação cria transações e exibe na lista
- CartaoSummary mostra fatura, barra de progresso e cards
- Relatórios tem toggle com aviso de dupla contagem
