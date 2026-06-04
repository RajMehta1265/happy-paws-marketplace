-- Add video_url column to standard pets table
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS video_url text;
