-- Migration: Add monthly_snapshots table
-- Stores one snapshot per month of the user's net income, total expenses and
-- available balance, so the evolution over time can be charted.

CREATE TABLE IF NOT EXISTS monthly_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL, -- first day of the month (e.g. 2026-06-01)
  net_income DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_expenses DECIMAL(12, 2) NOT NULL DEFAULT 0,
  available DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, month)
);

ALTER TABLE monthly_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own snapshots"
  ON monthly_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own snapshots"
  ON monthly_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own snapshots"
  ON monthly_snapshots FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own snapshots"
  ON monthly_snapshots FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_user_id ON monthly_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_month ON monthly_snapshots(month);

CREATE TRIGGER update_monthly_snapshots_updated_at
  BEFORE UPDATE ON monthly_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
