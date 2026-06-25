-- Add verification tracking to supplements
ALTER TABLE public.supplements
  ADD COLUMN IF NOT EXISTS verified    boolean      DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;
