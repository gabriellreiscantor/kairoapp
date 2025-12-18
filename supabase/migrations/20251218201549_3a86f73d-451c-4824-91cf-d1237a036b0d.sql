-- Adicionar novas colunas na tabela events
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS emoji text DEFAULT '📅',
ADD COLUMN IF NOT EXISTS is_all_day boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS repeat text DEFAULT 'never',
ADD COLUMN IF NOT EXISTS color text DEFAULT 'primary',
ADD COLUMN IF NOT EXISTS alerts jsonb DEFAULT '[{"time": "1hour"}]'::jsonb;