ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS apenas_usuario_adicional boolean NOT NULL DEFAULT false;
