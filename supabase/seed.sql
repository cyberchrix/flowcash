-- Seed script to insert default categories
-- Note: This will only work if you have a user authenticated
-- You may want to run this after creating a user or modify it to work with your auth setup

-- Example: Insert default categories for a specific user
-- Replace 'USER_UUID_HERE' with an actual user UUID from auth.users

-- Default categories (you can customize these)
-- INSERT INTO categories (name, color, user_id) VALUES
--   ('Housing', '#FF2D8A', 'USER_UUID_HERE'),
--   ('Children', '#8A2BFF', 'USER_UUID_HERE'),
--   ('Subscriptions', '#316CFF', 'USER_UUID_HERE'),
--   ('Transport', '#FFC04A', 'USER_UUID_HERE'),
--   ('Other', '#A1A1A1', 'USER_UUID_HERE');

-- Or create a function to initialize default categories for a new user
CREATE OR REPLACE FUNCTION create_default_categories_for_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier que les tables existent avant d'insérer
  -- Insert categories (ignore errors if table doesn't exist or RLS blocks)
  BEGIN
    INSERT INTO categories (name, color, user_id) VALUES
      ('Housing', '#FF2D8A', NEW.id),
      ('Children', '#8A2BFF', NEW.id),
      ('Subscriptions', '#316CFF', NEW.id),
      ('Transport', '#FFC04A', NEW.id),
      ('Other', '#A1A1A1', NEW.id)
    ON CONFLICT (name, user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error creating categories for user %: %', NEW.id, SQLERRM;
  END;
  
  -- Insert user settings
  BEGIN
    INSERT INTO user_settings (user_id, salary_net, currency) VALUES
      (NEW.id, 0, 'EUR')
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error creating user settings for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists (to avoid conflicts)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically create default categories when a user signs up
-- This requires the function to have SECURITY DEFINER to insert as the new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_categories_for_user();

