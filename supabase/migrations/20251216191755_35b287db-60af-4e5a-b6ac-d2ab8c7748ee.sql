-- Add metadata column to chat_messages for storing event cards and other structured data
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;