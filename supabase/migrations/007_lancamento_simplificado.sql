ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS lancamento_simplificado boolean NOT NULL DEFAULT false;
