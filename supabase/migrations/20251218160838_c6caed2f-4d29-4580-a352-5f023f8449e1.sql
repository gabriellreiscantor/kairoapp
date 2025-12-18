-- Add column to track when call alert was sent
ALTER TABLE public.events 
ADD COLUMN call_alert_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for efficient querying of upcoming alerts
CREATE INDEX idx_events_call_alert_pending ON public.events (event_date, event_time, call_alert_enabled, call_alert_sent_at)
WHERE call_alert_enabled = true AND call_alert_sent_at IS NULL;

-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;