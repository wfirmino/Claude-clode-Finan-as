ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS forma_pagamento varchar(10) NOT NULL DEFAULT 'cartao';
