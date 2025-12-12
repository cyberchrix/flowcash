-- Migration: Add tax_withholding_rate column to user_settings table
-- Date: 2024-12-12
-- Description: Adds a column to store the tax withholding rate (percentage) for calculating net income after tax

-- Add the tax_withholding_rate column (nullable, numeric)
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS tax_withholding_rate NUMERIC(5, 2);

-- Add a check constraint to ensure the rate is between 0 and 100
ALTER TABLE user_settings
ADD CONSTRAINT check_tax_withholding_rate_range 
CHECK (tax_withholding_rate IS NULL OR (tax_withholding_rate >= 0 AND tax_withholding_rate <= 100));

-- Add a comment to document the column
COMMENT ON COLUMN user_settings.tax_withholding_rate IS 'Tax withholding rate as a percentage (0-100). Used to calculate net income after tax: net_income = salary_net * (1 - tax_withholding_rate / 100)';

