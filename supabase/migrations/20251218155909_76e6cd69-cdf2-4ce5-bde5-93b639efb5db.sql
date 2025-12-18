-- Add FCM token columns to profiles table for push notifications
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS fcm_token TEXT,
ADD COLUMN IF NOT EXISTS fcm_token_updated_at TIMESTAMPTZ;