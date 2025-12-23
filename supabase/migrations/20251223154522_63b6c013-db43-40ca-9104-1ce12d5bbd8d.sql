-- Add timezone column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Sao_Paulo';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.timezone IS 'User IANA timezone string (e.g., America/Sao_Paulo, Europe/London)';