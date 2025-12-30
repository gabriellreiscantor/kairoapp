-- Add event_language column to events table (snapshot of language at event creation)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_language text NOT NULL DEFAULT 'pt-BR';