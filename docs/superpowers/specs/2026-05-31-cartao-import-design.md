# Design: Página Cartão + Importação OFX/CSV

**Data:** 2026-05-31  
**Status:** Aprovado pelo usuário

---

## Visão Geral

Adicionar ao sistema uma nova página **Cartão** que permite:
1. Cadastrar múltiplos cartões de crédito (nome, dia de vencimento, cor)
2. Importar extratos via OFX ou CSV de qualquer banco brasileiro
3. Visualizar fatura, valor pago e saldo em aberto com barra de progresso
4. Manter transações de cartão **separadas** das transações pessoais para evitar dupla contagem
5. Opção de incluir cartões nos Relatórios (desligada por padrão)

---

## Arquitetura

### Nova página
`src/pages/Cartao.tsx` — página independente no menu lateral, entre Transações e Parcelamentos.

### Novos arquivos
| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/pages/Cartao.tsx` | Página principal com seletor de abas por cartão |
| `src/hooks/useCards.ts` | CRUD dos cartões (create, update, delete, list) |
| `src/utils/importers.ts` | Parsers OFX (SGML e XML) e CSV multi-banco |
| `src/components/ImportModal.tsx` | Modal upload → preview → confirmar importação |
| `src/components/CartaoSummary.tsx` | Barra de progresso + 3 cards de resumo |

### Arquivos modificados
| Arquivo | O que muda |
|---------|-----------|
| `src/types/index.ts` | Adiciona interface `Card`, `card_id` em `Transaction` |
| `src/App.tsx` | Nova rota `/cartao` |
| `src/components/TopNav.tsx` | Novo item "Cartão" no menu lateral |
| `src/hooks/useTransactions.ts` | Adiciona `bulkCreateTransactions` para importação |
| `src/pages/Reports.tsx` | Toggle para incluir/excluir cartões no relatório |

---

## Banco de Dados

### Migration 012 — tabela `cards`
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
  USING (user_id = auth.uid());
```

### Migration 013 — coluna `card_id` em `transactions`
```sql
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS card_id uuid
  REFERENCES public.cards(id) ON DELETE SET NULL;
```

### Modelo de dados das transações de cartão
| Campo | Valor |
|-------|-------|
| `perfil` | `'cartao'` |
| `card_id` | uuid do cartão vinculado |
| `type` | `'expense'` (compra) ou `'income'` (pagamento da fatura) |
| `title` | Descrição importada (ex: "SUPERMERCADO ABC") |
| `amount` | Valor absoluto |
| `date` | Data da transação (YYYY-MM-DD) |

---

## UI da Página Cartão

### Estado vazio
Mensagem de boas-vindas + botão "Adicionar cartão".

### Estado com cartões
```
[● Nubank] [Itaú] [+ Novo]                    [Importar ↑]

┌─────────────────────────────────────────────────────┐
│  Fatura Maio 2026                       R$2.340,00  │
│  ████████████░░░░░░░░  53% pago                     │
│  Pago: R$1.240,00          Em aberto: R$1.100,00   │
│  Vence em 8 dias (dia 10)                           │
└─────────────────────────────────────────────────────┘

┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  💳 FATURA    │  │  ✅ PAGO      │  │  ⏳ EM ABERTO │
│  R$2.340,00  │  │  R$1.240,00  │  │  R$1.100,00  │
│  24 compras  │  │  1 pagamento  │  │  vence em 8d │
└───────────────┘  └───────────────┘  └───────────────┘

[Este mês ▾]  [Buscar...]
────────────────────────────────────────────────────
15/05  Supermercado Pão de Açúcar        -R$234,50
14/05  Netflix                            -R$44,90
10/05  ✅ Pagamento recebido           +R$1.240,00
```

### Lógica dos cards
- **Fatura** = soma de `expense` no período filtrado
- **Pago** = soma de `income` no período filtrado
- **Em aberto** = Fatura − Pago
- **Vence em X dias** = calculado a partir de `due_day` e data atual

### Cores da barra de progresso
| % pago | Cor |
|--------|-----|
| ≥ 80% | Verde |
| 40–79% | Amarelo |
| < 40% | Vermelho |

### Cores do "Vence em X dias"
| Dias restantes | Cor |
|----------------|-----|
| ≤ 3 dias | Vermelho |
| 4–7 dias | Amarelo |
| > 7 dias | Cinza |

### Modal — Novo/Editar Cartão
Campos: Nome (texto), Dia de vencimento (1–31), Cor (6 opções predefinidas).

### Modal — Importar
Fluxo: upload do arquivo → parse → preview com checkboxes → confirmar importação.
O cartão de destino é o cartão ativo no momento do clique em "Importar".

---

## Importação OFX/CSV

### OFX
- Suporta SGML (sem closing tags) e XML (com closing tags)
- Extrai: `<DTPOSTED>` (data), `<TRNAMT>` (valor), `<MEMO>` ou `<NAME>` (descrição)
- Encoding: tenta UTF-8, fallback para ISO-8859-1
- Positivo → `income`, negativo → `expense`

### CSV
- Auto-detecta delimitador (`;` ou `,`)
- Auto-detecta colunas por palavras-chave no cabeçalho:
  - Data: "data", "date", "dt"
  - Descrição: "histórico", "descrição", "memo", "lançamento"
  - Valor único: "valor", "amount"
  - Colunas separadas: "débito"/"crédito" ou "saída"/"entrada"
- Formatos de data suportados: DD/MM/YYYY, YYYY-MM-DD, YYYY/MM/DD

### Bancos suportados
OFX: Itaú, Bradesco, Santander, Banco do Brasil, Caixa, Nubank e qualquer banco que exporte OFX.  
CSV: Nubank, Inter, C6, XP e qualquer exportação com colunas padronizadas.

### `bulkCreateTransactions`
Nova função no `useTransactions.ts` que faz um único `INSERT` com array de transações e chama `fetchAll()` uma vez — evita N chamadas sequenciais.

---

## Integração com Relatórios

- Toggle no topo: `[✅ Pessoal] [✅ Empresarial] [✅ Kommo] [○ Cartão]`
- Cartão **desligado por padrão** para evitar dupla contagem
- Aviso exibido quando Cartão é ligado: "Incluir cartão pode duplicar valores se o pagamento da fatura já está em Pessoal"

### Card opcional no Dashboard
Card "💳 Faturas em aberto" mostrando total em aberto de todos os cartões e o mais próximo do vencimento. Ativado pelo usuário nas configurações do Dashboard (fora do escopo desta implementação — pode ser feito depois).

---

## Fora do Escopo (pode ser implementado depois)
- Card de faturas no Dashboard
- Limite de crédito por cartão
- Notificação de vencimento próximo
- Categorização automática por palavra-chave na descrição
- Detecção de duplicatas na importação

---

## Ordem de Implementação Sugerida

1. Migrações do banco (012 e 013)
2. Types + `useCards` hook
3. `importers.ts` (parsers OFX e CSV)
4. `ImportModal.tsx`
5. `CartaoSummary.tsx`
6. `Cartao.tsx` (página completa)
7. `bulkCreateTransactions` no hook
8. Rota + menu lateral
9. Toggle nos Relatórios
