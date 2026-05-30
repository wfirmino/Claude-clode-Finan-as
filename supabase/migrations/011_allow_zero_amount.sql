-- Permite amount = 0 para transações Kommo sem valor total definido
-- (sem_comissao = true, lancamento_simplificado = true, etc.)
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_amount_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_amount_check CHECK (amount >= 0);
