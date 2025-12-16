-- Add onboarding tracking fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_step text DEFAULT 'welcome',
ADD COLUMN IF NOT EXISTS first_event_created boolean DEFAULT false;