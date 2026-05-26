ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS perfil text NOT NULL DEFAULT 'pessoal'
    CHECK (perfil IN ('pessoal', 'empresarial', 'kommo')),
  ADD COLUMN IF NOT EXISTS nome_cliente text,
  ADD COLUMN IF NOT EXISTS nome_empresa text,
  ADD COLUMN IF NOT EXISTS divisao_socio numeric(12,2),
  ADD COLUMN IF NOT EXISTS plano integer,
  ADD COLUMN IF NOT EXISTS num_usuarios integer,
  ADD COLUMN IF NOT EXISTS valor_total_assinatura numeric(12,2),
  ADD COLUMN IF NOT EXISTS valor_liquido numeric(12,2),
  ADD COLUMN IF NOT EXISTS divisao_socio_pct numeric(5,2);

CREATE TABLE IF NOT EXISTS public.empresarial_config (
  user_id   uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  mes       text NOT NULL,
  prolabore numeric(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, mes)
);

ALTER TABLE public.empresarial_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own empresarial_config select" ON public.empresarial_config
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own empresarial_config insert" ON public.empresarial_config
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own empresarial_config update" ON public.empresarial_config
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own empresarial_config delete" ON public.empresarial_config
  FOR DELETE USING (auth.uid() = user_id);
