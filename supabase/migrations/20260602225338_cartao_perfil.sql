ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_perfil_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_perfil_check
  CHECK (perfil IN ('pessoal', 'empresarial', 'kommo', 'cartao'));