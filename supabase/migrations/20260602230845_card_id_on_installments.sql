ALTER TABLE public.installments
  ADD COLUMN IF NOT EXISTS card_id uuid REFERENCES public.cards(id) ON DELETE SET NULL;