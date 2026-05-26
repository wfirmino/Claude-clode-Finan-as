# Design — Perfis de Transação (Pessoal / Empresarial / Kommo)

**Data:** 2026-05-26
**Status:** Aprovado pelo usuário

---

## Visão geral

Adiciona o conceito de **perfil** às transações do app. Cada transação pertence a um de três perfis fixos: `pessoal`, `empresarial` ou `kommo`. A tela de Transações passa a ter abas de navegação por perfil, formulários dinâmicos por perfil, e resumos mensais específicos para Empresarial e Kommo.

---

## 1. Banco de dados

### 1.1 Migration 004 — campos adicionais em `transactions`

```sql
ALTER TABLE public.transactions
  ADD COLUMN perfil text NOT NULL DEFAULT 'pessoal'
    CHECK (perfil IN ('pessoal', 'empresarial', 'kommo')),
  ADD COLUMN nome_cliente text,
  ADD COLUMN nome_empresa text,
  ADD COLUMN divisao_socio numeric(12,2),        -- Empresarial: valor R$
  ADD COLUMN plano integer,                       -- Kommo: 3/6/9/12/24 meses
  ADD COLUMN num_usuarios integer,                -- Kommo
  ADD COLUMN valor_total_assinatura numeric(12,2),-- Kommo
  ADD COLUMN valor_liquido numeric(12,2),         -- Kommo: após maquininha
  ADD COLUMN divisao_socio_pct numeric(5,2);      -- Kommo: % divisão sócio
```

Todos os novos campos são nullable — apenas o perfil relevante os preencherá.

Os **campos calculados do Kommo** (taxa maquininha, comissões, valor sócio, valor final) são derivados dos campos brutos acima e calculados no frontend — não são armazenados no banco.

### 1.2 Nova tabela `empresarial_config`

Armazena o pró-labore mensal definido manualmente pelo usuário.

```sql
CREATE TABLE public.empresarial_config (
  user_id   uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  mes       text NOT NULL,  -- formato 'YYYY-MM'
  prolabore numeric(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, mes)
);

ALTER TABLE public.empresarial_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own empresarial_config select" ON public.empresarial_config
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own empresarial_config insert" ON public.empresarial_config
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own empresarial_config update" ON public.empresarial_config
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own empresarial_config delete" ON public.empresarial_config
  FOR DELETE USING (auth.uid() = user_id);
```

---

## 2. Tipos TypeScript

Em `src/types/index.ts`:

```ts
export type Perfil = 'pessoal' | 'empresarial' | 'kommo'
```

`Transaction` ganha os campos opcionais correspondentes às novas colunas.

Novo tipo `EmpresarialConfig`:
```ts
export interface EmpresarialConfig {
  user_id: string
  mes: string       // 'YYYY-MM'
  prolabore: number
}
```

---

## 3. Hooks

### 3.1 `useTransactions`
- Adiciona `perfil?: Perfil` ao `TransactionFilters` — filtra por perfil quando informado.
- Sem outras alterações.

### 3.2 `useEmpresarialConfig` (novo)
- Busca e salva o registro `empresarial_config` do mês corrente.
- Expõe: `prolabore`, `setProlabore(valor, mes)`, `loading`.

---

## 4. Tela de Transações

### 4.1 Abas de perfil

Adicionadas no topo da página, acima dos filtros existentes:

```
[ Pessoal ]  [ Empresarial ]  [ Kommo ]
```

- A aba ativa determina o `perfil` passado para `useTransactions`.
- Os cards de Receita, Despesa e Saldo recalculam com base apenas nas transações do perfil ativo.
- Filtros de data, tipo, categoria e busca textual continuam funcionando dentro do perfil selecionado.

### 4.2 Resumo mensal

Exibido abaixo dos cards, apenas nos perfis Empresarial e Kommo. Filtra sempre pelo **mês atual** (`YYYY-MM` do dia de hoje). Navegação para meses anteriores está fora do escopo desta fase.

**Empresarial:**

| Campo | Fonte |
|---|---|
| Faturamento total do mês | soma de transações `type = 'income'` do perfil |
| Total dividido com sócio | soma de `divisao_socio` das transações do mês |
| Despesa MEI | soma de transações `type = 'expense'` do perfil |
| Lucro | Faturamento − Total sócio − Despesa MEI |
| Pró-labore | campo editável inline → salvo em `empresarial_config` |
| Caixa da empresa | Lucro − Pró-labore |

O pró-labore é um campo numérico editável direto no resumo, com botão "Salvar". Ao salvar, Lucro e Caixa recalculam em tempo real.

**Kommo:**

| Campo | Fórmula |
|---|---|
| Total de assinaturas | soma de `valor_total_assinatura` |
| Total taxas maquininha | soma de `(valor_total_assinatura − valor_liquido)` |
| Total comissão Kommo (65%) | soma de `valor_total_assinatura × 0,65` |
| Total comissão bruta (35%) | soma de `valor_total_assinatura × 0,35` |
| Total comissão líquida | comissão bruta − taxas maquininha |
| Total pago ao sócio | soma de `comissão_liquida × divisao_socio_pct / 100` |
| Total final do usuário | comissão líquida − total sócio |

### 4.3 Componentes novos
- `ProfileTabs` — abas Pessoal / Empresarial / Kommo
- `EmpresarialSummary` — resumo mensal Empresarial com pró-labore editável
- `KommoSummary` — resumo mensal Kommo com todos os totais calculados

---

## 5. Formulário "Nova Transação"

### 5.1 Campo de perfil

Seletor no topo do formulário (antes dos outros campos). Ao trocar, os campos abaixo mudam dinamicamente.

### 5.2 Campos por perfil

**Pessoal** — sem alteração:
> Título · Valor · Tipo · Data · Categoria · Observação

**Empresarial** — o campo Título some, substituído por:
> Nome do cliente · Nome da empresa · Valor total (faturamento) · Divisão com sócio (R$) · Tipo · Data · Observação

O campo `title` no banco é preenchido automaticamente com `nome_cliente`. O campo `amount` recebe o valor total (faturamento).

**Kommo** — campos de entrada:
> Nome do cliente · Nome da empresa · Plano (dropdown: 3 / 6 / 9 / 12 / 24 meses) · Nº de usuários · Valor total da assinatura · Valor líquido recebido · Divisão com sócio (%)

Kommo é sempre `type = 'income'` — não há campo Tipo no formulário. O campo `title` no banco é preenchido automaticamente com `nome_cliente`. O campo `amount` recebe `valor_total_assinatura`.

**Painel de campos calculados Kommo** (somente leitura, atualização ao vivo):

| Campo | Fórmula |
|---|---|
| Taxa maquininha | Valor total − Valor líquido |
| Comissão Kommo (65%) | Valor total × 0,65 |
| Comissão bruta (35%) | Valor total × 0,35 |
| Comissão líquida | Comissão bruta − Taxa maquininha |
| Valor do sócio | Comissão líquida × % divisão / 100 |
| Valor final do usuário | Comissão líquida − Valor do sócio |

O painel aparece abaixo dos inputs de Kommo assim que `valor_total_assinatura` e `valor_liquido` forem preenchidos. Não são campos de formulário — apenas exibição.

Ao salvar uma transação Kommo, apenas os campos brutos são persistidos no banco; os calculados são rederivados no frontend sempre que necessário.

---

## 6. Testes

- Aba Pessoal filtra e exibe apenas transações `perfil = 'pessoal'`
- Aba Empresarial recalcula cards de Receita / Despesa / Saldo corretamente
- Resumo Empresarial: Lucro e Caixa recalculam ao editar pró-labore
- Resumo Kommo: totais acumulam corretamente com múltiplas transações
- Formulário Kommo: campos calculados atualizam ao vivo (ex: alterar `valor_liquido` recalcula taxa maquininha)
- Formulário troca campos ao mudar perfil (Pessoal → Empresarial → Kommo)
- Salvar transação Empresarial persiste `nome_cliente`, `nome_empresa`, `divisao_socio`
- Salvar transação Kommo persiste os 5 campos brutos corretamente

---

## 7. Fora do escopo

- Dashboard não é alterado (continua mostrando todas as transações sem filtro por perfil)
- Relatórios não são alterados nesta fase
- Não há perfis criados dinamicamente pelo usuário — os 3 perfis são fixos
