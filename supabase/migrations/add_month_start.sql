-- Choose whether a month starts on the salary date or on the first calendar day.
-- Run in the Supabase SQL editor.

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS month_start TEXT NOT NULL DEFAULT 'salary'
    CHECK (month_start IN ('salary', 'calendar'));
