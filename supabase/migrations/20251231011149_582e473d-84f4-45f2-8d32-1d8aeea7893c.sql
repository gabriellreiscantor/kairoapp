-- Add max_events_per_month column to plan_limits
ALTER TABLE public.plan_limits 
ADD COLUMN IF NOT EXISTS max_events_per_month integer NOT NULL DEFAULT 30;

-- Update limits for each plan
UPDATE public.plan_limits SET max_events_per_month = 30 WHERE plan = 'free';
UPDATE public.plan_limits SET max_events_per_month = 150 WHERE plan = 'plus';
UPDATE public.plan_limits SET max_events_per_month = 1000 WHERE plan = 'super';

-- Create function to count events created this month
CREATE OR REPLACE FUNCTION public.count_user_events_this_month(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::INTEGER FROM events 
  WHERE user_id = _user_id 
  AND created_at >= date_trunc('month', now())
$$;

-- Update can_create_event to check BOTH weekly AND monthly limits
CREATE OR REPLACE FUNCTION public.can_create_event(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (
    SELECT (
      count_user_events_this_week(_user_id) < pl.max_events_per_week
      AND count_user_events_this_month(_user_id) < pl.max_events_per_month
    )
    FROM plan_limits pl
    WHERE pl.plan = get_user_plan(_user_id)
  )
$$;