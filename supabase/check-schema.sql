-- Script de diagnostic pour vérifier la configuration du schéma
-- Exécutez ce script dans Supabase SQL Editor pour vérifier que tout est correctement configuré

-- 1. Vérifier que les tables existent
SELECT 
  'Tables' as check_type,
  table_name as item_name,
  CASE 
    WHEN table_name IN ('categories', 'expenses', 'user_settings') THEN '✅ Existe'
    ELSE '❌ Manquante'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('categories', 'expenses', 'user_settings')
UNION ALL
SELECT 
  'Tables' as check_type,
  table_name as item_name,
  '❌ Manquante' as status
FROM (VALUES ('categories'), ('expenses'), ('user_settings')) AS expected(table_name)
WHERE table_name NOT IN (
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public'
);

-- 2. Vérifier que RLS est activé
SELECT 
  'RLS' as check_type,
  tablename as item_name,
  CASE 
    WHEN rowsecurity THEN '✅ Activé'
    ELSE '❌ Désactivé'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('categories', 'expenses', 'user_settings');

-- 3. Vérifier les politiques RLS
SELECT 
  'Policy' as check_type,
  tablename || ' - ' || policyname as item_name,
  '✅ Existe' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('categories', 'expenses', 'user_settings')
ORDER BY tablename, policyname;

-- 4. Vérifier que la fonction existe
SELECT 
  'Function' as check_type,
  routine_name as item_name,
  CASE 
    WHEN routine_name = 'create_default_categories_for_user' THEN '✅ Existe'
    ELSE '❌ Manquante'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'create_default_categories_for_user';

-- 5. Vérifier que le trigger existe
SELECT 
  'Trigger' as check_type,
  trigger_name as item_name,
  CASE 
    WHEN trigger_name = 'on_auth_user_created' THEN '✅ Existe'
    ELSE '❌ Manquant'
  END as status
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 6. Vérifier la contrainte UNIQUE sur categories
SELECT 
  'Constraint' as check_type,
  conname as item_name,
  '✅ Existe' as status
FROM pg_constraint
WHERE conrelid = 'categories'::regclass
  AND contype = 'u'
  AND array_length(conkey, 1) = 2; -- Vérifie qu'il y a 2 colonnes dans la contrainte unique

-- Résumé des vérifications
SELECT 
  '=== RÉSUMÉ ===' as check_type,
  'Vérifiez que tous les éléments ci-dessus sont ✅' as item_name,
  'Si vous voyez ❌, exécutez schema.sql et seed.sql' as status;

