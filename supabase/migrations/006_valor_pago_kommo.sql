ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS valor_pago_kommo numeric(12,2);
