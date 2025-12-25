-- Create call_logs table for remote debugging
CREATE TABLE public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  data JSONB,
  device TEXT DEFAULT 'iOS',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert logs (including anonymous/unauthenticated for edge cases)
CREATE POLICY "Anyone can insert logs" ON public.call_logs
FOR INSERT WITH CHECK (true);

-- Policy: Users can read their own logs
CREATE POLICY "Users can read own logs" ON public.call_logs
FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can delete their own logs (cleanup)
CREATE POLICY "Users can delete own logs" ON public.call_logs
FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_call_logs_user_created ON public.call_logs(user_id, created_at DESC);
CREATE INDEX idx_call_logs_event_type ON public.call_logs(event_type);