# Dashboard por Perfil — Design Spec

**Data:** 2026-06-01  
**Status:** Aprovado para implementação

---

## Problema

O dashboard atual exibe um único conjunto de totais (saldo, receitas, despesas) consolidando todas as transações independentemente do perfil. O sistema possui três perfis distintos — `pessoal`, `empresarial` e `kommo` — cada um com semântica e campos diferentes, mas esses dados nunca aparecem separados na visão principal.

---

## Solução

Adicionar uma barra de abas no topo do Dashboard com quatro abas: **Geral · Pessoal · Empresarial · Kommo**. Cada aba mostra cards de resumo relevantes para aquele perfil, filtrados pelo mês atual. Os gráficos permanecem exclusivos da aba Geral para manter a leveza no mobile.

---

## Foco

Mobile-first. Nenhum elemento horizontal que quebre em telas pequenas.

---

## Abas e conteúdo

### Aba Geral (comportamento atual — sem regressões)
- Cards: Saldo atual (histórico completo), Receitas do mês, Despesas do mês
- Gráfico pizza: gastos por categoria do mês atual
- Gráfico barras: receitas vs despesas nos últimos 6 meses
- Lista: últimas 5 transações

### Aba Pessoal
Cards do mês atual, filtrado por `perfil = 'pessoal'`:
- Receitas do mês
- Despesas do mês
- Saldo do mês (receitas − despesas)

### Aba Empresarial
Cards do mês atual, filtrado por `perfil = 'empresarial'`:
- Receitas do mês
- Despesas do mês
- Saldo do mês
- Pró-labore (valor do mês atual via `empresarial_config`)

### Aba Kommo
Cards do mês atual, filtrado por `perfil = 'kommo'`:
- Receitas brutas (`type = 'income'`)
- Valor pago à Kommo (soma de `valor_pago_kommo`)
- Valor líquido recebido (soma de `valor_liquido_recebido`)
- Saldo do mês (receitas − `valor_pago_kommo`)

---

## Arquitetura

### Estado
```ts
const [activeTab, setActiveTab] = useState<'geral' | 'pessoal' | 'empresarial' | 'kommo'>('geral')
```
Estado local em `Dashboard.tsx`. Sem persistência em URL — a aba padrão ao entrar é sempre "Geral".

### Dados
O hook `useTransactions({ noLimit: true })` já carrega todas as transações. A filtragem por perfil e mês acontece via `useMemo` no componente, sem requisições adicionais.

Para o pró-labore, `useEmpresarialConfig` já existe em `src/hooks/useEmpresarialConfig.ts` — será chamado no Dashboard e o valor do mês atual extraído por comparação com `new Date()`.

### Mudanças em `calculations.ts`
Adicionar função:
```ts
function calculatePerfilMonthTotals(
  transactions: Transaction[],
  perfil: Perfil
): { income: number; expense: number; balance: number }
```
Filtra `filterCurrentMonth(transactions)` por `t.perfil === perfil`, depois soma income e expense.

Para Kommo, adicionar função separada:
```ts
function calculateKommoMonthTotals(
  transactions: Transaction[]
): { income: number; valorPagoKommo: number; valorLiquidoRecebido: number }
```

### Mudanças em `Dashboard.tsx`
1. Importar `useEmpresarialConfig`
2. Adicionar estado `activeTab`
3. Renderizar barra de abas (4 botões, estilo consistente com o restante do sistema)
4. Renderizar conteúdo condicional por aba:
   - `activeTab === 'geral'` → JSX atual sem alteração
   - `activeTab === 'pessoal'` → 3 cards via `calculatePerfilMonthTotals`
   - `activeTab === 'empresarial'` → 4 cards via `calculatePerfilMonthTotals` + pró-labore
   - `activeTab === 'kommo'` → 4 cards via `calculateKommoMonthTotals`

---

## Tratamento de ausência de dados

Se não houver transações do perfil no mês atual, os cards exibem `R$ 0,00` — sem mensagem de erro, comportamento idêntico ao Geral quando não há transações.

Se `empresarial_config` não tiver registro para o mês atual, o card de Pró-labore exibe `R$ 0,00`.

---

## O que não muda

- Nenhuma mudança nas páginas de Transações, Parcelamentos, Metas ou Cartões
- Nenhuma mudança no banco de dados ou nos hooks existentes (exceto adicionar chamada de `useEmpresarialConfig` no Dashboard)
- Nenhuma mudança no roteamento
- Os gráficos não são replicados nas abas de perfil

---

## Critérios de aceite

- [ ] Aba Geral exibe exatamente o mesmo conteúdo de hoje
- [ ] Abas Pessoal, Empresarial e Kommo mostram apenas transações do mês atual com o perfil correto
- [ ] Pró-labore na aba Empresarial reflete o valor de `empresarial_config` do mês atual
- [ ] Layout não quebra em viewport mobile (375px)
- [ ] Aba ativa visualmente destacada; troca de aba sem reload
