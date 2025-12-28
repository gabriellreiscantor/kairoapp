-- Add device_id column to events table
-- This enables VoIP push to be sent to the device that created the event
-- regardless of which user is logged in (device-centric architecture)

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS device_id TEXT;

-- Add index for faster lookups when joining with devices table
CREATE INDEX IF NOT EXISTS idx_events_device_id ON public.events(device_id);

-- Add comment explaining the purpose
COMMENT ON COLUMN public.events.device_id IS 'Device UUID that created this event - used to send VoIP push to the correct device';