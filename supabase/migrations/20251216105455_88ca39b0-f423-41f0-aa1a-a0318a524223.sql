-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  smart_suggestions_enabled BOOLEAN DEFAULT true,
  auto_reschedule_enabled BOOLEAN DEFAULT true,
  context_aware_enabled BOOLEAN DEFAULT true,
  learn_patterns_enabled BOOLEAN DEFAULT true,
  preferred_times JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de mensagens do chat
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de eventos/lembretes
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  duration_minutes INTEGER DEFAULT 60,
  location TEXT,
  category TEXT DEFAULT 'geral',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  notification_enabled BOOLEAN DEFAULT true,
  call_alert_enabled BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'missed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de padrões aprendidos do usuário
CREATE TABLE public.user_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('preferred_time', 'common_event', 'missed_event', 'location')),
  pattern_data JSONB NOT NULL,
  confidence FLOAT DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_patterns ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Chat messages policies
CREATE POLICY "Users can view their own messages"
ON public.chat_messages FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages"
ON public.chat_messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
ON public.chat_messages FOR DELETE
USING (auth.uid() = user_id);

-- Events policies
CREATE POLICY "Users can view their own events"
ON public.events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own events"
ON public.events FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events"
ON public.events FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events"
ON public.events FOR DELETE
USING (auth.uid() = user_id);

-- User patterns policies
CREATE POLICY "Users can view their own patterns"
ON public.user_patterns FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own patterns"
ON public.user_patterns FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patterns"
ON public.user_patterns FOR UPDATE
USING (auth.uid() = user_id);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email));
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_patterns_updated_at
  BEFORE UPDATE ON public.user_patterns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();