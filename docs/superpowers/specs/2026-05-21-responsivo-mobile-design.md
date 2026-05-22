# Responsivo Mobile — Design Spec

**Data:** 2026-05-21  
**Escopo:** Adaptar o app para funcionar bem em telas mobile, sem alterar o layout desktop.

---

## Decisões

| Ponto | Decisão |
|---|---|
| Desktop | Inalterado em todas as páginas |
| Navegação mobile | Bottom navigation bar (4–5 ícones fixos) |
| Cards do Dashboard | Grid 2 colunas no mobile (3 colunas no desktop) |
| Gráficos | Coluna única, 100% largura no mobile |
| Lista de transações | Card por transação (data, ícone, categoria, valor) |
| Detalhe da transação | Bottom sheet deslizando de baixo |
| Demais páginas | Colunas empilhadas (1 coluna) no mobile |

---

## Componentes a criar/modificar

### 1. Layout.tsx — Bottom Navigation (mobile)
- Esconder sidebar (`hidden md:flex`) no mobile
- Adicionar `<BottomNav>` fixo na parte inferior, visível apenas no mobile (`md:hidden`)
- Ícones: Dashboard, Transações, Parcelamentos, Metas, Mais (ou Relatórios)
- `main` ganha `pb-16` no mobile para não ficar atrás do nav

### 2. Dashboard.tsx — Grid responsivo
- Cards de resumo: `grid-cols-2 md:grid-cols-3`
- Gráficos: `grid-cols-1 md:grid-cols-2`

### 3. Transactions.tsx — Cards mobile + Bottom Sheet
- No mobile (`< md`): renderizar cada transação como card estilo referência
  - Data no topo esquerdo + menu `⋮` no topo direito
  - Ícone de categoria + título
  - Tag de categoria
  - Valor grande alinhado à direita (verde/vermelho)
- No desktop: tabela existente inalterada
- Ao tocar em um card mobile: abrir `<TransactionSheet>` (bottom sheet)
  - Painel desliza de baixo com overlay escuro
  - Header: "Detalhes da Transação" + botões Editar / Excluir
  - Corpo: ícone + valor grande, linhas Data / Categoria com ícones

### 4. Installments.tsx — Cards mobile
- Tabela existente no desktop inalterada
- No mobile: cada parcelamento vira card empilhado

### 5. Goals.tsx, Categories.tsx, Reports.tsx
- Ajustes de grid/padding para mobile (1 coluna)
- Sem mudança no desktop

---

## Breakpoint

Usar exclusivamente o breakpoint `md` (768px) do Tailwind:
- `< md` → mobile
- `>= md` → desktop (comportamento atual, inalterado)

---

## Fora do escopo
- Dark mode
- Animações elaboradas (bottom sheet usa transição simples)
- Mudança no tema de cores
- Qualquer alteração visível em viewport `>= 768px`
