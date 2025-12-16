-- Add weather forecast columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN weather_forecast_enabled BOOLEAN DEFAULT false,
ADD COLUMN weather_forecast_time TIME DEFAULT '07:00';