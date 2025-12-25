-- Add columns for push notification scheduling (separate from call alert)
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS notification_scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ;