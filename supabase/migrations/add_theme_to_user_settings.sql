-- Migration: Add theme column to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS theme VARCHAR(10) DEFAULT 'light' CHECK (theme IN ('light', 'dark'));

