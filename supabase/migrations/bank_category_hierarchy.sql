ALTER TABLE public.categories
  ALTER COLUMN name TYPE VARCHAR(120);

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE;

ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_name_user_id_key;

DO $$
BEGIN
  ALTER TABLE public.categories
    ADD CONSTRAINT categories_user_parent_name_key UNIQUE NULLS NOT DISTINCT (user_id, parent_id, name);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
