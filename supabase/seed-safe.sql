-- Version SÉCURISÉE du script seed
-- Cette version ne bloque pas la création de l'utilisateur si quelque chose échoue

-- Supprimer l'ancienne fonction et trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_default_categories_for_user();

-- Créer une fonction qui gère les erreurs gracieusement
CREATE OR REPLACE FUNCTION create_default_categories_for_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Vérifier que les tables existent avant d'insérer
  -- Utiliser des blocs d'exception séparés pour chaque insertion
  
  -- Insert categories avec gestion d'erreur
  BEGIN
    INSERT INTO public.categories (name, color, user_id) VALUES
      ('Housing', '#FF2D8A', NEW.id),
      ('Children', '#8A2BFF', NEW.id),
      ('Subscriptions', '#316CFF', NEW.id),
      ('Transport', '#FFC04A', NEW.id),
      ('Other', '#A1A1A1', NEW.id)
    ON CONFLICT (name, user_id) DO NOTHING;
  EXCEPTION 
    WHEN undefined_table THEN
      -- Table n'existe pas encore, on continue
      RAISE WARNING 'Table categories does not exist yet. Skipping category creation.';
    WHEN OTHERS THEN
      -- Autre erreur, on log mais on continue
      RAISE WARNING 'Error creating categories for user %: % - %', NEW.id, SQLSTATE, SQLERRM;
  END;
  
  -- Insert user settings avec gestion d'erreur
  BEGIN
    INSERT INTO public.user_settings (user_id, salary_net, currency) VALUES
      (NEW.id, 0, 'EUR')
    ON CONFLICT (user_id) DO UPDATE SET
      salary_net = COALESCE(user_settings.salary_net, 0),
      currency = COALESCE(user_settings.currency, 'EUR');
  EXCEPTION 
    WHEN undefined_table THEN
      -- Table n'existe pas encore, on continue
      RAISE WARNING 'Table user_settings does not exist yet. Skipping settings creation.';
    WHEN OTHERS THEN
      -- Autre erreur, on log mais on continue
      RAISE WARNING 'Error creating user settings for user %: % - %', NEW.id, SQLSTATE, SQLERRM;
  END;
  
  -- Toujours retourner NEW pour que la création de l'utilisateur réussisse
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur fatale, on log mais on retourne quand même NEW
    -- pour ne pas bloquer la création de l'utilisateur
    RAISE WARNING 'Critical error in create_default_categories_for_user for user %: % - %', NEW.id, SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$;

-- Créer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_categories_for_user();

-- Vérification
SELECT 
  '✅ Trigger créé' as status,
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

