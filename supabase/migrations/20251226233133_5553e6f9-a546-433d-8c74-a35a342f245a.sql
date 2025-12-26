-- Add fcm_token_platform field to detect iOS (APNs) vs Android (FCM)
-- This allows proper routing of push notifications to the correct service

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS fcm_token_platform TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.fcm_token_platform IS 'Platform of fcm_token: ios (APNs token) or android (FCM token)';