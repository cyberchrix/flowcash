-- A row exists only when the user corrects a month's opening balance.
-- A missing row means the balance is carried from the previous month.

CREATE TABLE IF NOT EXISTS month_opening_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL, -- first day of the funded month
  amount_cents BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, month)
);

ALTER TABLE month_opening_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own opening balances"
  ON month_opening_balances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own opening balances"
  ON month_opening_balances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own opening balances"
  ON month_opening_balances FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own opening balances"
  ON month_opening_balances FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_month_opening_balances_user_id ON month_opening_balances(user_id);

CREATE TRIGGER update_month_opening_balances_updated_at
  BEFORE UPDATE ON month_opening_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
