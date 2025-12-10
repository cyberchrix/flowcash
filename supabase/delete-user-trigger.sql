-- Trigger pour supprimer automatiquement l'utilisateur de auth.users
-- quand toutes ses données sont supprimées
-- 
-- Note: Cette fonction nécessite les permissions SECURITY DEFINER
-- et doit être exécutée par un administrateur Supabase

-- Fonction pour supprimer l'utilisateur de auth.users
-- quand toutes ses données sont supprimées
CREATE OR REPLACE FUNCTION delete_auth_user_when_data_deleted()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si l'utilisateur a encore des données dans les autres tables
  DECLARE
    has_expenses BOOLEAN;
    has_categories BOOLEAN;
    has_settings BOOLEAN;
  BEGIN
    -- Vérifier expenses
    SELECT EXISTS(SELECT 1 FROM expenses WHERE user_id = OLD.user_id) INTO has_expenses;
    -- Vérifier categories
    SELECT EXISTS(SELECT 1 FROM categories WHERE user_id = OLD.user_id) INTO has_categories;
    -- Vérifier user_settings
    SELECT EXISTS(SELECT 1 FROM user_settings WHERE user_id = OLD.user_id) INTO has_settings;

    -- Si toutes les données sont supprimées, supprimer l'utilisateur de auth.users
    IF NOT has_expenses AND NOT has_categories AND NOT has_settings THEN
      -- Supprimer l'utilisateur de auth.users
      -- Note: Cela nécessite des permissions spéciales
      DELETE FROM auth.users WHERE id = OLD.user_id;
    END IF;
  END;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer les triggers sur chaque table
-- Note: Ces triggers ne fonctionneront que si vous avez les bonnes permissions

-- Trigger sur user_settings
DROP TRIGGER IF EXISTS trigger_delete_auth_user_on_settings_delete ON user_settings;
CREATE TRIGGER trigger_delete_auth_user_on_settings_delete
  AFTER DELETE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION delete_auth_user_when_data_deleted();

-- Note: Les triggers sur expenses et categories peuvent aussi être créés si nécessaire
-- mais ils seront probablement déclenchés après la suppression de user_settings
-- à cause de l'ordre de suppression dans l'API route.

