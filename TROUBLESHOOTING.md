# Guide de dépannage - Erreur "Database error saving new user"

## 🔍 Diagnostic de l'erreur

Si vous voyez l'erreur **"Database error saving new user"** lors de l'inscription, cela signifie que le schéma de base de données n'est pas correctement configuré dans Supabase.

## ✅ Solution : Vérifier et configurer le schéma Supabase

### Étape 1 : Vérifier que le schéma est exécuté

1. **Connectez-vous à Supabase Dashboard** : https://app.supabase.com
2. **Sélectionnez votre projet**
3. **Allez dans SQL Editor** (dans le menu de gauche)
4. **Exécutez cette requête pour vérifier si les tables existent** :

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('categories', 'expenses', 'user_settings');
```

Si vous ne voyez pas les 3 tables (`categories`, `expenses`, `user_settings`), passez à l'étape 2.

### Étape 2 : Exécuter le schéma SQL

1. **Dans SQL Editor**, créez une nouvelle requête
2. **Copiez tout le contenu** du fichier `supabase/schema.sql`
3. **Collez-le dans l'éditeur SQL**
4. **Cliquez sur "Run"** (ou Ctrl+Enter)

Vous devriez voir des messages de confirmation pour chaque table créée.

### Étape 3 : Exécuter le script seed (pour le trigger)

1. **Créez une nouvelle requête dans SQL Editor**
2. **Copiez tout le contenu** du fichier `supabase/seed.sql`
3. **Collez-le dans l'éditeur SQL**
4. **Cliquez sur "Run"**

Ce script créera :
- La fonction `create_default_categories_for_user()`
- Le trigger `on_auth_user_created` qui crée automatiquement les catégories par défaut pour chaque nouvel utilisateur

### Étape 4 : Vérifier que le trigger fonctionne

Exécutez cette requête pour vérifier que le trigger existe :

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

Vous devriez voir le trigger listé.

## 🔧 Vérifications supplémentaires

### Vérifier les politiques RLS

Exécutez cette requête pour voir toutes les politiques RLS :

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Vous devriez voir des politiques pour `categories`, `expenses`, et `user_settings`.

### Vérifier que RLS est activé

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('categories', 'expenses', 'user_settings');
```

Toutes les tables doivent avoir `rowsecurity = true`.

## 🚨 Erreurs courantes

### Erreur : "permission denied for schema public"

**Solution** : Assurez-vous d'exécuter les scripts SQL en tant qu'administrateur (vous devriez l'être par défaut dans le SQL Editor).

### Erreur : "relation already exists"

**Solution** : C'est normal si vous avez déjà exécuté le schéma. Vous pouvez ignorer ces erreurs, ou supprimer les tables existantes avant de réexécuter (attention : cela supprimera toutes vos données !).

### Erreur : "function create_default_categories_for_user() does not exist"

**Solution** : Vérifiez que vous avez bien exécuté le contenu de `supabase/seed.sql` qui crée cette fonction.

### Le trigger ne se déclenche pas

**Causes possibles** :
1. Le trigger n'existe pas → Exécutez `supabase/seed.sql`
2. La fonction a une erreur → Vérifiez les logs dans Supabase Dashboard > Logs
3. Les permissions ne sont pas correctes → Vérifiez que la fonction a `SECURITY DEFINER`

## 📝 Ordre d'exécution recommandé

1. ✅ Exécuter `supabase/schema.sql` (crée les tables, RLS, politiques)
2. ✅ Exécuter `supabase/seed.sql` (crée la fonction et le trigger)
3. ✅ Tester l'inscription dans l'application

## 🎯 Test final

Après avoir exécuté les scripts :

1. **Allez sur `/auth` dans votre application**
2. **Créez un nouveau compte** avec un email différent
3. **Si ça fonctionne**, vous devriez être redirigé vers la page d'accueil
4. **Vérifiez dans Supabase** :
   - Table `auth.users` : vous devriez voir votre nouvel utilisateur
   - Table `categories` : vous devriez voir 5 catégories par défaut pour cet utilisateur
   - Table `user_settings` : vous devriez voir un enregistrement avec `salary_net = 0`

## 📞 Besoin d'aide ?

Si le problème persiste :
1. Vérifiez les logs dans Supabase Dashboard > Logs > Postgres Logs
2. Vérifiez la console du navigateur (F12) pour voir les erreurs détaillées
3. Vérifiez que vous utilisez bien la clé **anon** (pas service_role) dans `.env.local`

