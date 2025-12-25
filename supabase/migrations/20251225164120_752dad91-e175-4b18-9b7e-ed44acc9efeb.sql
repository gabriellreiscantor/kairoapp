-- Add column to store the exact scheduled time for the call alert
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS call_alert_scheduled_at timestamp with time zone;

-- Add index for efficient querying by the cron job
CREATE INDEX IF NOT EXISTS idx_events_call_alert_scheduled 
ON public.events (call_alert_scheduled_at) 
WHERE call_alert_enabled = true AND call_alert_sent_at IS NULL;