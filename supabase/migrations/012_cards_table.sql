CREATE TABLE public.cards (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  due_day    int  NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  color      text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cards_owner" ON public.cards
  FOR ALL USING (user_id = auth.uid());
