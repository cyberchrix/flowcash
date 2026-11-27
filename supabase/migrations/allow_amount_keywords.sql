-- Allow one general keyword and another for the same word at an exact amount.
ALTER TABLE categorization_rules DROP CONSTRAINT IF EXISTS categorization_rules_user_id_pattern_key;

DO $$
BEGIN
  ALTER TABLE categorization_rules
    ADD CONSTRAINT categorization_rules_user_pattern_amount_key
    UNIQUE NULLS NOT DISTINCT (user_id, pattern, amount_cents);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
