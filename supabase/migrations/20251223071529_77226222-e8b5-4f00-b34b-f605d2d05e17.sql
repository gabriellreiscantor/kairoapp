-- Add font preference column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS font_preference TEXT DEFAULT 'system';

-- Valid values: 'system', 'inter', 'roboto', 'poppins', 'nunito', 'lato'
-- 'system' is the default (uses device native font)