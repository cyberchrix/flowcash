# Scripts de Seed

## Créer un utilisateur de test

Avant de pouvoir utiliser le script de seed, vous devez avoir un USER_ID.

### Option 1 : Créer un utilisateur de test automatiquement

Exécutez :
```bash
npm run create-test-user
```

Ce script va :
- Créer un utilisateur de test avec l'email `test@availo.local` et le mot de passe `test123456`
- Afficher le USER_ID à ajouter dans votre `.env.local`

**Note** : Si l'email confirmation est activée dans Supabase, vous devrez peut-être la désactiver temporairement dans Settings > Authentication > Email Auth.

### Option 2 : Obtenir le USER_ID depuis la console du navigateur

1. **Connectez-vous à votre application** (via l'interface ou avec l'utilisateur de test créé ci-dessus)

2. **Ouvrez la console du navigateur** (F12)

3. **Obtenez votre USER_ID** en utilisant l'une de ces méthodes :

   **Méthode A - Via l'API** :
   ```javascript
   fetch('/api/auth/user').then(r => r.json()).then(d => console.log('USER_ID:', d.id))
   ```

   **Méthode B - Via le client Supabase** (si disponible dans la console) :
   ```javascript
   // D'abord, importez le client Supabase
   const { createClient } = await import('@supabase/supabase-js');
   const supabase = createClient(
     'VOTRE_SUPABASE_URL',
     'VOTRE_SUPABASE_ANON_KEY'
   );
   const { data } = await supabase.auth.getUser();
   console.log('USER_ID:', data.user?.id);
   ```

## Script de données mock

Le script `seed-mock-data.ts` permet d'ajouter automatiquement des données de test dans votre base Supabase.

### Utilisation

1. **Obtenez votre USER_ID** :
   - Connectez-vous à votre application
   - Ouvrez la console du navigateur (F12)
   - Exécutez dans la console :
     ```javascript
     // Si vous avez accès à supabase dans la console
     (await fetch('/api/auth/user').then(r => r.json()).then(d => console.log(d.id)))
     
     // Ou via Supabase directement si disponible
     await supabase.auth.getUser().then(r => console.log(r.data.user?.id))
     ```

2. **Exécutez le script** :
   ```bash
   USER_ID=votre-user-id-ici npm run seed
   ```

   Ou ajoutez `USER_ID` dans votre `.env.local` :
   ```env
   USER_ID=votre-user-id-ici
   ```
   Puis exécutez simplement :
   ```bash
   npm run seed
   ```

### Ce que fait le script

- ✅ Crée les catégories par défaut si elles n'existent pas
- ✅ Configure un salaire net de 4645 €
- ✅ Ajoute 10 dépenses mock réparties sur les 30 derniers jours :
  - Loyer mensuel (2090.25 €)
  - Courses (250.50 €)
  - Netflix (15.99 €)
  - Spotify (9.99 €)
  - Abonnement transport (75.00 €)
  - Carburant (80.00 €)
  - Restaurant (45.00 €)
  - Assurance habitation (85.50 €)
  - École enfants (350.00 €)
  - Amazon Prime (49.90 €)

### Note

Le script utilise les politiques RLS (Row Level Security) de Supabase, donc vous devez être authentifié. Si vous obtenez des erreurs de permissions, vérifiez que :
1. Votre USER_ID est correct
2. Les tables ont bien RLS activé avec les bonnes politiques
3. Vous avez exécuté les scripts SQL (schema.sql et seed.sql) dans Supabase

