ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS sem_comissao boolean NOT NULL DEFAULT false;
