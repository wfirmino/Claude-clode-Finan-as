ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS valor_liquido_recebido numeric(12,2);
