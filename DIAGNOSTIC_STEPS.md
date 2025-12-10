# 🔍 Étapes de diagnostic - Erreur "Database error saving new user"

## Étape 1 : Vérifier les logs Supabase

L'erreur `unexpected_failure` vient de Supabase. Pour voir l'erreur exacte :

1. **Allez sur Supabase Dashboard** : https://app.supabase.com
2. **Sélectionnez votre projet**
3. **Allez dans Logs** (dans le menu de gauche)
4. **Sélectionnez "Postgres Logs"** ou "Database Logs"
5. **Tentez une nouvelle inscription** dans votre application
6. **Regardez les logs** - vous devriez voir l'erreur exacte qui bloque

Les logs vous donneront l'erreur SQL exacte qui cause le problème.

## Étape 2 : Vérifier que les tables existent

Exécutez dans SQL Editor :

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('categories', 'expenses', 'user_settings');
```

Vous devez voir les 3 tables. Si non, exécutez `schema.sql`.

## Étape 3 : Vérifier le trigger

Exécutez :

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

Le trigger doit exister et être lié à `auth.users`.

## Étape 4 : Désactiver temporairement le trigger

Pour tester si le problème vient du trigger :

```sql
-- Désactiver le trigger
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- Tester l'inscription
-- Si ça fonctionne, le problème vient du trigger

-- Réactiver ensuite
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
```

## Étape 5 : Utiliser la version sécurisée du trigger

Si le problème vient du trigger, utilisez la version sécurisée :

1. **Exécutez `supabase/seed-safe.sql`** dans SQL Editor
2. Cette version ne bloquera jamais la création de l'utilisateur
3. Elle loguera juste des warnings si quelque chose échoue

## Étape 6 : Vérifier les politiques RLS

Le trigger utilise `SECURITY DEFINER` donc il devrait contourner RLS, mais vérifions :

```sql
-- Vérifier que les politiques existent
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('categories', 'user_settings')
ORDER BY tablename, policyname;
```

## Solution de secours : Désactiver le trigger et créer manuellement

Si rien ne fonctionne, vous pouvez :

1. **Désactiver le trigger** (voir étape 4)
2. **Créer les catégories manuellement** après l'inscription
3. **Ou utiliser un endpoint API** pour initialiser les données après l'inscription

## Cause probable

L'erreur la plus probable est que :
- Les tables n'existent pas → Exécutez `schema.sql`
- Le trigger échoue silencieusement → Utilisez `seed-safe.sql`
- Un problème de permissions → Vérifiez les logs Supabase

## Prochaines actions

1. ✅ **Vérifiez les logs Supabase** (Étape 1) - C'est la chose la plus importante !
2. ✅ **Exécutez `check-schema.sql`** pour voir ce qui manque
3. ✅ **Essayez `seed-safe.sql`** si le trigger pose problème

Les logs Supabase vous donneront l'erreur exacte à corriger.

