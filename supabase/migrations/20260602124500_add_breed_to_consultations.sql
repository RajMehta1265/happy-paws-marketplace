-- Add breed column to consultations table
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS breed text;
