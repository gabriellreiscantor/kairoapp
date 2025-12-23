-- Add notification preference columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS push_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS call_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS sound_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS vibration_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS critical_alerts_enabled boolean NOT NULL DEFAULT true;