-- ==============================================
-- VoIP Device-Based Architecture Migration
-- ==============================================
-- CRITICAL: VoIP tokens are DEVICE-based, not USER-based
-- This fixes the architecture to correctly handle iOS VoIP tokens

-- 1. Create the devices table
CREATE TABLE public.devices (
  device_id TEXT PRIMARY KEY,
  voip_token TEXT UNIQUE NOT NULL,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  platform TEXT NOT NULL DEFAULT 'ios',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create index for faster lookups by user_id
CREATE INDEX idx_devices_user_id ON public.devices(user_id);

-- 3. Enable Row Level Security
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Allow service role full access (for edge functions)
CREATE POLICY "Service role full access" 
ON public.devices 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Authenticated users can view their own devices
CREATE POLICY "Users can view their own devices" 
ON public.devices 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Authenticated users can insert devices (with or without user_id)
CREATE POLICY "Users can insert devices" 
ON public.devices 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Authenticated users can update their own devices
CREATE POLICY "Users can update their own devices" 
ON public.devices 
FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid() OR user_id IS NULL);

-- 5. Create trigger for updated_at
CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON public.devices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Migrate existing VoIP tokens from profiles to devices
-- This preserves any existing tokens during migration
INSERT INTO public.devices (device_id, voip_token, user_id, platform)
SELECT 
  gen_random_uuid()::text, -- temporary device_id (will be replaced by actual device)
  voip_token,
  id as user_id,
  'ios' as platform
FROM public.profiles
WHERE voip_token IS NOT NULL
ON CONFLICT (voip_token) DO NOTHING;

-- 7. Remove voip_token column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS voip_token;