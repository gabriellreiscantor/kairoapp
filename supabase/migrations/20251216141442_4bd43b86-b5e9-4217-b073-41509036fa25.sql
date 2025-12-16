-- Create enum for subscription plans
CREATE TYPE public.subscription_plan AS ENUM ('free', 'plus', 'super');

-- Create table for user subscriptions
CREATE TABLE public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    plan subscription_plan NOT NULL DEFAULT 'free',
    billing_period TEXT DEFAULT 'monthly',
    started_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for plan limits
CREATE TABLE public.plan_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan subscription_plan NOT NULL UNIQUE,
    max_events_per_week INTEGER NOT NULL,
    max_google_calendars INTEGER NOT NULL DEFAULT 2,
    max_kairo_calendars INTEGER NOT NULL DEFAULT 3,
    chat_capacity_multiplier INTEGER NOT NULL DEFAULT 1,
    has_conflict_detection BOOLEAN DEFAULT false,
    has_daily_overview BOOLEAN DEFAULT false,
    price_monthly DECIMAL(10,2) DEFAULT 0,
    price_yearly DECIMAL(10,2) DEFAULT 0
);

-- Insert plan limits data
INSERT INTO public.plan_limits (plan, max_events_per_week, max_google_calendars, max_kairo_calendars, chat_capacity_multiplier, has_conflict_detection, has_daily_overview, price_monthly, price_yearly) VALUES
('free', 14, 2, 3, 1, false, false, 0, 0),
('plus', 50, 15, 5, 5, true, true, 14.90, 148.40),
('super', 280, 25, 30, 20, true, true, 29.90, 297.80);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

-- RLS for user_subscriptions
CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
ON public.user_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
ON public.user_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

-- RLS for plan_limits (public read)
CREATE POLICY "Anyone can view plan limits"
ON public.plan_limits FOR SELECT
USING (true);

-- Function to get user plan
CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id UUID)
RETURNS subscription_plan
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT plan FROM user_subscriptions WHERE user_id = _user_id AND (expires_at IS NULL OR expires_at > now())),
    'free'::subscription_plan
  )
$$;

-- Function to count user events this week
CREATE OR REPLACE FUNCTION public.count_user_events_this_week(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM events 
  WHERE user_id = _user_id 
  AND created_at >= date_trunc('week', now())
$$;

-- Function to check if user can create event
CREATE OR REPLACE FUNCTION public.can_create_event(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT count_user_events_this_week(_user_id) < pl.max_events_per_week
    FROM plan_limits pl
    WHERE pl.plan = get_user_plan(_user_id)
  )
$$;

-- Trigger for updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();