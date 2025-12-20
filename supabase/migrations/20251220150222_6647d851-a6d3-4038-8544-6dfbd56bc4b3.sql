-- Add voip_token column to profiles table for iOS VoIP Push notifications
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS voip_token TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_voip_token ON public.profiles(voip_token) WHERE voip_token IS NOT NULL;