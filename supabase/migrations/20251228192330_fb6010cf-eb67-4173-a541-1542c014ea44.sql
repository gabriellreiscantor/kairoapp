-- Add UNIQUE constraint on voip_token to prevent duplicate tokens
-- Only apply to non-null values (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS devices_voip_token_unique
ON public.devices (voip_token)
WHERE voip_token IS NOT NULL;