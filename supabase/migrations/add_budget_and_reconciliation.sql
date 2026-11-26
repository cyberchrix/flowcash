-- Budgets, reconciliation and transaction currency.
-- Run in the Supabase SQL editor. Does not change existing amounts.

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'EUR';

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS week_starts_on SMALLINT NOT NULL DEFAULT 1
    CHECK (week_starts_on IN (0, 1));

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Europe/Paris';

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS expense_type TEXT NOT NULL DEFAULT 'fixed_recurring'
    CHECK (expense_type IN ('fixed_recurring', 'fixed_once', 'variable'));

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS match_mode TEXT NOT NULL DEFAULT 'none'
    CHECK (match_mode IN ('merchant', 'category', 'manual', 'none'));

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS match_pattern TEXT;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS amount_tolerance_cents INTEGER NOT NULL DEFAULT 0
    CHECK (amount_tolerance_cents >= 0);

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS date_tolerance_days INTEGER NOT NULL DEFAULT 2
    CHECK (date_tolerance_days >= 0);

CREATE TABLE IF NOT EXISTS category_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  effective_month DATE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  forecast TEXT NOT NULL DEFAULT 'variable' CHECK (forecast IN ('variable', 'fixed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE (user_id, category_id, currency, effective_month)
);

CREATE TABLE IF NOT EXISTS expense_occurrences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL,
  planned_cents BIGINT NOT NULL,
  expected_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE (expense_id, month)
);

CREATE TABLE IF NOT EXISTS expense_transaction_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
  occurrence_id UUID REFERENCES expense_occurrences(id) ON DELETE CASCADE NOT NULL,
  allocated_cents BIGINT NOT NULL CHECK (allocated_cents > 0),
  status TEXT NOT NULL CHECK (status IN ('suggested', 'confirmed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE (transaction_id, occurrence_id)
);

ALTER TABLE category_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_transaction_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own category budgets" ON category_budgets;
DROP POLICY IF EXISTS "Users can create their own category budgets" ON category_budgets;
DROP POLICY IF EXISTS "Users can update their own category budgets" ON category_budgets;
DROP POLICY IF EXISTS "Users can delete their own category budgets" ON category_budgets;
DROP POLICY IF EXISTS "Users can view their own expense occurrences" ON expense_occurrences;
DROP POLICY IF EXISTS "Users can create their own expense occurrences" ON expense_occurrences;
DROP POLICY IF EXISTS "Users can update their own expense occurrences" ON expense_occurrences;
DROP POLICY IF EXISTS "Users can delete their own expense occurrences" ON expense_occurrences;
DROP POLICY IF EXISTS "Users can view their own expense links" ON expense_transaction_links;
DROP POLICY IF EXISTS "Users can create their own expense links" ON expense_transaction_links;
DROP POLICY IF EXISTS "Users can update their own expense links" ON expense_transaction_links;
DROP POLICY IF EXISTS "Users can delete their own expense links" ON expense_transaction_links;

CREATE POLICY "Users can view their own category budgets"
  ON category_budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own category budgets"
  ON category_budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own category budgets"
  ON category_budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own category budgets"
  ON category_budgets FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own expense occurrences"
  ON expense_occurrences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own expense occurrences"
  ON expense_occurrences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own expense occurrences"
  ON expense_occurrences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own expense occurrences"
  ON expense_occurrences FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own expense links"
  ON expense_transaction_links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own expense links"
  ON expense_transaction_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own expense links"
  ON expense_transaction_links FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own expense links"
  ON expense_transaction_links FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_category_budgets_user_month ON category_budgets(user_id, effective_month);
CREATE INDEX IF NOT EXISTS idx_expense_occurrences_user_month ON expense_occurrences(user_id, month);
CREATE INDEX IF NOT EXISTS idx_expense_links_transaction ON expense_transaction_links(transaction_id);

CREATE OR REPLACE FUNCTION enforce_transaction_allocation()
RETURNS TRIGGER AS $$
DECLARE
  txn_cents BIGINT;
  used_cents BIGINT;
BEGIN
  SELECT ABS(amount_cents) INTO txn_cents FROM transactions WHERE id = NEW.transaction_id;
  SELECT COALESCE(SUM(allocated_cents), 0) INTO used_cents
    FROM expense_transaction_links
    WHERE transaction_id = NEW.transaction_id
      AND id IS DISTINCT FROM NEW.id;
  IF used_cents + NEW.allocated_cents > txn_cents THEN
    RAISE EXCEPTION 'Allocation exceeds transaction amount';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_transaction_allocation ON expense_transaction_links;
CREATE TRIGGER check_transaction_allocation
  BEFORE INSERT OR UPDATE ON expense_transaction_links
  FOR EACH ROW
  EXECUTE FUNCTION enforce_transaction_allocation();

DROP TRIGGER IF EXISTS update_category_budgets_updated_at ON category_budgets;
CREATE TRIGGER update_category_budgets_updated_at
  BEFORE UPDATE ON category_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expense_occurrences_updated_at ON expense_occurrences;
CREATE TRIGGER update_expense_occurrences_updated_at
  BEFORE UPDATE ON expense_occurrences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
