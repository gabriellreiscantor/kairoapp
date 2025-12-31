-- Tabela de calendários do usuário
CREATE TABLE public.calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#F97316',
  is_default BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  provider TEXT DEFAULT 'horah',
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own calendars" ON public.calendars FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own calendars" ON public.calendars FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own calendars" ON public.calendars FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own calendars" ON public.calendars FOR DELETE USING (auth.uid() = user_id);

-- Trigger para garantir apenas 1 calendário padrão por usuário
CREATE OR REPLACE FUNCTION public.ensure_single_default_calendar()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.calendars SET is_default = false WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_single_default_calendar
AFTER INSERT OR UPDATE ON public.calendars
FOR EACH ROW EXECUTE FUNCTION public.ensure_single_default_calendar();

-- Trigger de updated_at
CREATE TRIGGER update_calendars_updated_at
BEFORE UPDATE ON public.calendars
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar calendar_id na tabela events
ALTER TABLE public.events ADD COLUMN calendar_id UUID REFERENCES public.calendars(id) ON DELETE SET NULL;