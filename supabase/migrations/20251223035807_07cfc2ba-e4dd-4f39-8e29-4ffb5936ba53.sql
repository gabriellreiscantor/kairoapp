-- Add has_critical_alerts column to plan_limits
ALTER TABLE public.plan_limits 
ADD COLUMN has_critical_alerts boolean NOT NULL DEFAULT false;

-- Update existing plans: free = false, plus/super = true
UPDATE public.plan_limits SET has_critical_alerts = false WHERE plan = 'free';
UPDATE public.plan_limits SET has_critical_alerts = true WHERE plan IN ('plus', 'super');