# Design: Sistema de Login + Dashboard de Controle Financeiro Pessoal

**Data:** 2026-05-19  
**Status:** Aprovado

---

## Visão Geral

Aplicação de controle financeiro pessoal com autenticação por e-mail e senha, acessível via navegador (web) e executável desktop (Windows/Mac). Um único usuário gerencia receitas, despesas, categorias, metas de economia e relatórios. Os dados são armazenados na nuvem via Supabase.

---

## Arquitetura

- **Frontend:** React + Vite (TypeScript)
- **Desktop:** Electron empacota o app React como executável `.exe` — nenhum código extra
- **Backend:** Supabase (Auth + PostgreSQL + RLS) — sem servidor próprio
- **Comunicação:** `supabase-js` SDK diretamente no frontend

```
Frontend (React + Vite)
        │ supabase-js
        ▼
   Supabase Cloud
   ├── Auth (e-mail + senha)
   └── PostgreSQL (dados financeiros, RLS ativo)

Electron
   └── Empacota o app React para desktop
```

---

## Modelo de Dados

### `profiles`
| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | FK → auth.users |
| email | text | E-mail do usuário |
| created_at | timestamp | Data de criação |

### `categories`
| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → profiles |
| name | text | Ex: "Alimentação" |
| type | text | `"income"` ou `"expense"` |
| color | text | Cor hex para gráficos |
| created_at | timestamp | Data de criação |

### `transactions`
| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → profiles |
| category_id | uuid | FK → categories (nullable — categoria é opcional) |
| title | text | Ex: "Supermercado" |
| amount | numeric | Valor positivo |
| type | text | `"income"` ou `"expense"` |
| date | date | Data da transação |
| notes | text | Observação opcional |
| created_at | timestamp | Data de registro |

### `goals`
| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → profiles |
| title | text | Ex: "Reserva de emergência" |
| target | numeric | Valor alvo |
| current | numeric | Valor atual |
| deadline | date | Prazo da meta |
| created_at | timestamp | Data de criação |

**RLS:** Todas as tabelas têm Row Level Security ativo. Cada operação (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) é restrita ao `user_id` do usuário autenticado.

---

## Telas e Componentes

### Autenticação
- Tela de login com campos de e-mail e senha
- Link "Esqueci minha senha" — dispara e-mail de reset via Supabase Auth
- Sessão persistida automaticamente pelo Supabase
- Todas as rotas além de `/login` redirecionam para login se não autenticado
- **Sem tela de registro no app** — a conta é criada uma única vez via painel do Supabase (Authentication → Users → Add user)

### Dashboard (página inicial)
- Cards de resumo: Saldo atual (soma histórica de todas as receitas − todas as despesas), Total de receitas do mês, Total de despesas do mês
- Gráfico de pizza: gastos por categoria no mês corrente
- Gráfico de barras: receitas vs despesas dos últimos 6 meses
- Lista das últimas 5 transações com link para ver todas

### Transações
- Tabela paginada com filtros por período, tipo (`income`/`expense`) e categoria
- Modal para adicionar, editar e excluir transação
- Campos do modal: título, valor, categoria (opcional), data, observação (opcional)
- Ao selecionar a categoria, o tipo da transação (`income`/`expense`) é preenchido automaticamente com base em `categories.type`

### Categorias
- Lista de categorias com cor e tipo
- Criar, editar e excluir categorias
- Validação: não permite excluir categoria com transações vinculadas

### Metas
- Cards individuais com barra de progresso (`current / target`)
- Alerta visual quando a meta está próxima do prazo e abaixo do progresso esperado
- Criar, editar e excluir metas
- O campo `current` é atualizado manualmente pelo usuário ao editar a meta

### Relatórios
- Filtro por período: mês atual, trimestre, ano ou período personalizado
- Tabela e gráfico de gastos por categoria no período selecionado
- Exportação dos dados filtrados para CSV

---

## Tratamento de Erros e Segurança

### Autenticação
- Credenciais inválidas: mensagem "E-mail ou senha incorretos"
- Reset de senha via e-mail (fluxo nativo do Supabase Auth)
- Rotas protegidas por guard de autenticação no React Router

### Dados
- Validação no frontend antes de enviar ao Supabase: campos obrigatórios, valores numéricos positivos, datas válidas
- Erros de rede exibem notificação toast sem travar a interface

### Segurança
- RLS no Supabase impede acesso cruzado entre usuários mesmo com a chave `anon` exposta
- Chaves do Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) armazenadas em `.env`, nunca commitadas

---

## Testes

- **Unitários (Vitest):** funções de cálculo — saldo, totais mensais, progresso de metas
- **Integração (React Testing Library):** fluxos principais — login, adicionar transação, criar categoria
- Sem testes E2E neste escopo

---

## Stack Resumida

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Estilo | Tailwind CSS |
| Gráficos | Recharts |
| Roteamento | React Router v6 |
| Backend/Auth/DB | Supabase |
| Desktop | Electron |
| Testes | Vitest + React Testing Library |
