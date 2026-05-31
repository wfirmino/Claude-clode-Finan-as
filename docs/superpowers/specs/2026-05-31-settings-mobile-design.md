# Settings Mobile — Design Spec

**Data:** 2026-05-31  
**Escopo:** Mobile only (max ~430px). Desktop permanece inalterado visualmente.  
**Tema:** Dark-first, com suporte a Claro e Auto. Preferência salva no localStorage afeta todo o app via classe `dark` no `document.documentElement`.

---

## 1. Arquitetura

### Estratégia de dark mode
- `tailwind.config.js`: adicionar `darkMode: 'class'`
- `useTheme.ts`: ao mudar ou inicializar o tema, aplicar/remover a classe `dark` em `document.documentElement`
- Páginas de Configurações são dark-first (classes `dark:` invertidas para light)
- Páginas existentes ficam visualmente inalteradas até migração futura de dark mode

### Rotas novas (dentro de `ProtectedRoute` + `Layout`)
```
/settings                → src/pages/settings/SettingsPage.tsx
/settings/profile        → src/pages/settings/ProfilePage.tsx
/settings/change-password → src/pages/settings/ChangePasswordPage.tsx
```

### Arquivos modificados
| Arquivo | Mudança |
|---|---|
| `tailwind.config.js` | `darkMode: 'class'` |
| `src/hooks/useTheme.ts` | Aplica classe `dark` ao DOM na inicialização e ao mudar tema |
| `src/components/Layout.tsx` | Botão ☰ no header mobile + wiring do `Drawer` |
| `src/App.tsx` | 3 novas rotas de settings |

### Arquivos novos
- `src/pages/settings/SettingsPage.tsx`
- `src/pages/settings/ProfilePage.tsx`
- `src/pages/settings/ChangePasswordPage.tsx`

---

## 2. Layout.tsx — Header Mobile

**Mudanças:**
- Adicionar estado `drawerOpen: boolean`
- Substituir o layout do header mobile: botão ☰ à esquerda, "FinanceApp" ao centro, sem botão "Sair" (logout migra para /settings)
- Importar e renderizar `<Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />`
- Botão ☰: `onClick={() => setDrawerOpen(true)}`

**Drawer.tsx** já está implementado com banner e link para `/settings`. Nenhuma mudança necessária.

---

## 3. Página `/settings` — Configurações

**Wrapper:** `min-h-screen bg-[#111] text-white md:hidden`

### Header
- Texto "Configurações" centralizado, fundo `#111`

### Foto de perfil
- Círculo 96px com `avatar_url` do Supabase Storage (fallback: inicial do nome ou ícone genérico)
- Ícone ✏️ sobreposto no canto inferior direito
- Click no lápis → `<input type="file" accept="image/*">` hidden → upload para Supabase Storage bucket `avatars` → `updateProfile({ avatar_url })`
- Nome do usuário centralizado abaixo da foto

### Seção "Geral"
- Label de seção: texto cinza pequeno, uppercase
- Item: `👤 Perfil` → navega para `/settings/profile` via `useNavigate`

### Seção "Preferências"
- Item: `🎨 Aparência` — abaixo, 3 cards inline:
  - `☀️ Claro` | `🌙 Escuro` | `🖥️ Auto`
  - Card selecionado: borda verde `#22c55e`, background levemente destacado
  - Fundo dos cards: `#1a1a1a`, borda padrão: cinza escuro
  - Ao selecionar: chama `changeTheme(t)` do `useTheme`

### Seção "Segurança"
- Item: `🔒 Alterar senha` → navega para `/settings/change-password`

### Rodapé
- Botão `→ Sair` em vermelho (`text-red-500`)
- Chama `supabase.auth.signOut()` e navega para `/login`

---

## 4. Página `/settings/profile` — Perfil

**Wrapper:** `min-h-screen bg-[#111] text-white md:hidden`

### Header
- Seta ← (volta) + título "Perfil"

### Seção "Informações Pessoais"
- Campo: **Nome** (texto, `profiles.name`)
- Campo: **Data de nascimento** (date, `profiles.birth_date`)

### Seção "Informações de Contato"
- Campo: **E-mail** (read-only, vem de `supabase.auth.getUser()`, ícone ✅ à direita)
- Campo: **WhatsApp** (texto, `profiles.whatsapp`)

### Botão Salvar
- Chama `updateProfile({ name, birth_date, whatsapp })` do `useProfile`
- Toast de sucesso/erro via componente `Toast` existente

### Excluir conta
- `🗑️ Excluir conta` em vermelho no final
- Confirmação via `window.confirm()` antes de executar
- Executa `supabase.auth.admin.deleteUser()` — ou instrui o usuário a contatar suporte se a API não estiver disponível no client
- Alternativa viável no client: `supabase.rpc('delete_user')` (requer função RPC criada no Supabase)

> **Decisão:** Excluir conta exibe um modal de confirmação e chama uma função RPC `delete_user` no Supabase (a ser criada). Se não existir, exibe mensagem informando que a exclusão deve ser solicitada pelo suporte.

### Campos
- Bordas arredondadas `rounded-xl`, fundo `#1a1a1a`, texto branco, placeholder cinza
- Labels acima dos campos em cinza pequeno

---

## 5. Página `/settings/change-password` — Trocar Senha

**Wrapper:** `min-h-screen bg-[#111] text-white md:hidden`

### Header
- Seta ← (volta) + título "Trocar senha"
- Subtítulo: "Use 8 ou mais caracteres com uma mistura de letras, números e símbolos"

### Campos
- **Senha atual** (password)
- **Nova senha** (password + toggle 👁️)
- **Confirme a nova senha** (password + toggle 👁️)
- Texto auxiliar abaixo dos campos de nova senha: "Ao menos 8 caracteres"

### Validação (client-side)
- Nova senha ≥ 8 caracteres
- Nova senha === Confirme a nova senha
- Exibe erro inline antes de chamar Supabase

### Ação
1. Busca email do usuário via `supabase.auth.getUser()`
2. Chama `supabase.auth.signInWithPassword({ email, password: senhaAtual })` para verificar senha atual
3. Se válido, chama `supabase.auth.updateUser({ password: novaSenha })`
4. Sucesso: Toast + volta para `/settings`
5. Erro: Toast com mensagem do Supabase (ex: "Senha atual incorreta")

### Botão fixo no rodapé
- `position: sticky; bottom: 0` ou `fixed bottom-0`
- Texto "Trocar Senha", fundo verde `#22c55e`, texto preto

---

## 6. Visual — Design Tokens

| Token | Valor |
|---|---|
| Fundo principal | `#111111` |
| Card / input bg | `#1a1a1a` |
| Borda padrão | `#2a2a2a` |
| Accent / primário | `#22c55e` (verde) |
| Texto principal | `#ffffff` |
| Texto secundário | `#9ca3af` (gray-400) |
| Label de seção | `#6b7280` (gray-500), uppercase, text-xs |
| Erro / destrutivo | `#ef4444` (red-500) |

---

## 7. Restrição de viewport

Todas as páginas de settings usam `md:hidden` no wrapper raiz, garantindo que o conteúdo não apareça em telas ≥ 768px. No desktop o usuário simplesmente não vê o conteúdo (tela em branco dentro do Layout). As rotas existem mas não são acessíveis via navegação desktop.

> **Nota:** A sidebar desktop não linka para `/settings`, mantendo o comportamento atual inalterado no desktop.

---

## 8. Dependências

- Nenhuma lib nova. Usa: React Router DOM, Supabase JS, Tailwind CSS, `useProfile`, `useTheme`, `useAuth` (hooks já existentes), componente `Toast` existente.
- Upload de avatar: Supabase Storage bucket `avatars` (deve existir ou ser criado no painel Supabase).
