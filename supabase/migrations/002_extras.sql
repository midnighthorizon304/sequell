-- New columns on supplements
ALTER TABLE public.supplements
  ADD COLUMN IF NOT EXISTS dose_multiplier  numeric      DEFAULT 1,
  ADD COLUMN IF NOT EXISTS other_ingredients jsonb       DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cautions         text         DEFAULT '',
  ADD COLUMN IF NOT EXISTS suggested_use    text         DEFAULT '';

-- Preferences table (fasting settings, etc.)
CREATE TABLE IF NOT EXISTS public.preferences (
  key        text        PRIMARY KEY,
  value      jsonb       NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access" ON public.preferences
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);
