-- Add language column to profiles table for multilingual MeLig support
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'pt-BR';