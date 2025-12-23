-- Create weekly_reports table for storing generated weekly summaries
CREATE TABLE public.weekly_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_number INTEGER NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_events INTEGER NOT NULL DEFAULT 0,
  total_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  category_distribution JSONB NOT NULL DEFAULT '[]'::jsonb,
  headline TEXT NOT NULL,
  description TEXT,
  language TEXT DEFAULT 'pt-BR',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicate reports for same user/week
CREATE UNIQUE INDEX weekly_reports_user_week_idx ON public.weekly_reports (user_id, week_number, EXTRACT(YEAR FROM week_start));

-- Enable Row Level Security
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own reports" 
ON public.weekly_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reports" 
ON public.weekly_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add weekly_report_enabled to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS weekly_report_enabled BOOLEAN DEFAULT true;

-- Add weekly_report_day to profiles (0 = Sunday, 1 = Monday, etc.)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS weekly_report_day INTEGER DEFAULT 0;

-- Add last_weekly_report_at to profiles to track when last report was shown
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_weekly_report_at TIMESTAMP WITH TIME ZONE;