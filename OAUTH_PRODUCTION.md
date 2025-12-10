# 🔧 Configuration OAuth pour la Production

Ce guide vous aide à résoudre les problèmes de redirection OAuth en production.

## ⚠️ Problème : OAuth fonctionne en local mais pas en production

Si la redirection OAuth fonctionne en local mais pas en production, suivez ces étapes :

---

## 📋 Checklist de configuration

### 1. ✅ Configurer les URLs dans Supabase Dashboard

1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Settings** > **Authentication** > **URL Configuration**
4. Configurez :

   **Site URL** :
   - `https://votre-domaine.vercel.app` (votre URL de production)

   **Redirect URLs** :
   - `http://localhost:3000/**` (pour le développement)
   - `https://votre-domaine.vercel.app/**` (pour la production)
   - `https://votre-domaine.vercel.app/auth/callback` (spécifiquement)

   ⚠️ **Important** : Ajoutez `/**` à la fin pour autoriser toutes les routes, ou spécifiez chaque route individuellement.

---

### 2. ✅ Configurer Google OAuth pour la production

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez votre projet
3. Allez dans **APIs & Services** > **Credentials**
4. Cliquez sur votre **OAuth 2.0 Client ID**
5. Dans **Authorized JavaScript origins**, ajoutez :
   - `https://votre-domaine.vercel.app`
   - `http://localhost:3000` (gardez celui-ci pour le développement)

6. Dans **Authorized redirect URIs**, ajoutez :
   - `https://votre-projet-id.supabase.co/auth/v1/callback`
   - `https://votre-domaine.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (gardez celui-ci pour le développement)

---

### 3. ✅ Configurer Facebook OAuth pour la production

1. Allez sur [Facebook Developers](https://developers.facebook.com/)
2. Sélectionnez votre application
3. Allez dans **Settings** > **Basic**
4. Dans **App Domains**, ajoutez :
   - `votre-domaine.vercel.app` (sans https://)
   - `votre-projet-id.supabase.co`

5. Allez dans **Products** > **Facebook Login** > **Settings**
6. Dans **Valid OAuth Redirect URIs**, ajoutez :
   - `https://votre-projet-id.supabase.co/auth/v1/callback`
   - `https://votre-domaine.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (gardez celui-ci pour le développement)

---

### 4. ✅ Configurer GitHub OAuth pour la production

1. Allez sur [GitHub Developer Settings](https://github.com/settings/developers)
2. Sélectionnez votre OAuth App
3. Dans **Homepage URL**, mettez :
   - `https://votre-domaine.vercel.app`

4. Dans **Authorization callback URL**, ajoutez (une par ligne ou séparées par des virgules) :
   - `https://votre-projet-id.supabase.co/auth/v1/callback`
   - `https://votre-domaine.vercel.app/auth/callback`

---

## 🔍 Vérification et dépannage

### Erreur : "redirect_uri_mismatch"

**Cause** : L'URL de redirection dans votre application ne correspond pas à celles configurées dans le provider OAuth.

**Solution** :
1. Vérifiez que `https://votre-domaine.vercel.app/auth/callback` est bien ajouté dans :
   - Google Cloud Console (Authorized redirect URIs)
   - Facebook Developers (Valid OAuth Redirect URIs)
   - GitHub Settings (Authorization callback URL)

2. Vérifiez que `https://votre-projet-id.supabase.co/auth/v1/callback` est aussi ajouté (Supabase gère la redirection intermédiaire)

### Erreur : "Invalid redirect URL"

**Cause** : L'URL n'est pas autorisée dans Supabase Dashboard.

**Solution** :
1. Allez dans Supabase Dashboard > **Settings** > **Authentication** > **URL Configuration**
2. Ajoutez `https://votre-domaine.vercel.app/**` dans **Redirect URLs**
3. Vérifiez que **Site URL** est configuré avec votre URL de production

### La redirection fonctionne mais redirige vers localhost

**Cause** : Les variables d'environnement ne sont pas correctement configurées en production.

**Solution** :
1. Vérifiez que vos variables d'environnement sont définies dans Vercel/plateforme de déploiement :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. Vérifiez que vous avez redéployé après avoir changé les variables d'environnement

### Erreur 404 sur `/auth/callback` en production

**Cause** : La route de callback n'est pas accessible ou mal configurée.

**Solution** :
1. Vérifiez que le fichier `src/app/auth/callback/route.ts` existe et est déployé
2. Vérifiez que vous avez fait un `git push` et que Vercel a déployé la dernière version
3. Vérifiez les logs de déploiement pour voir s'il y a des erreurs

---

## 📝 Ordre des redirections OAuth

1. **Utilisateur clique sur "Continuer avec Google/Facebook/GitHub"**
   - L'application envoie une requête à Supabase avec `redirectTo: https://votre-domaine.vercel.app/auth/callback`

2. **Supabase redirige vers le provider OAuth**
   - URL : `https://accounts.google.com/oauth/authorize?...&redirect_uri=https://votre-projet-id.supabase.co/auth/v1/callback`
   - Le `redirect_uri` pointe vers Supabase, pas directement vers votre app

3. **Provider OAuth authentifie l'utilisateur et redirige vers Supabase**
   - URL : `https://votre-projet-id.supabase.co/auth/v1/callback?code=...`

4. **Supabase échange le code et redirige vers votre application**
   - URL : `https://votre-domaine.vercel.app/auth/callback?code=...`

5. **Votre route `/auth/callback` échange le code pour une session**
   - Le code utilise `exchangeCodeForSession` pour créer la session
   - Redirige vers `/` (home)

---

## ✅ Test de vérification

1. **Vérifiez les URLs dans le code** :
   ```javascript
   // Dans src/app/auth/page.tsx
   redirectTo: `${window.location.origin}/auth/callback`
   ```
   Cette ligne devrait générer automatiquement `https://votre-domaine.vercel.app/auth/callback` en production.

2. **Vérifiez la console du navigateur** :
   - Ouvrez les outils de développement (F12)
   - Allez dans l'onglet "Network" ou "Réseau"
   - Essayez de vous connecter avec OAuth
   - Regardez les requêtes pour voir où la redirection échoue

3. **Vérifiez les logs Supabase** :
   - Allez dans Supabase Dashboard > **Logs** > **Auth Logs**
   - Cherchez les erreurs liées à OAuth

---

## 🚀 Résumé rapide

Pour que OAuth fonctionne en production :

1. ✅ **Supabase Dashboard** : Ajouter `https://votre-domaine.vercel.app/**` dans Redirect URLs
2. ✅ **Google Cloud Console** : Ajouter `https://votre-domaine.vercel.app/auth/callback` dans Authorized redirect URIs
3. ✅ **Facebook Developers** : Ajouter `https://votre-domaine.vercel.app/auth/callback` dans Valid OAuth Redirect URIs
4. ✅ **GitHub Settings** : Ajouter `https://votre-domaine.vercel.app/auth/callback` dans Authorization callback URL
5. ✅ **Vercel** : Vérifier que les variables d'environnement sont configurées
6. ✅ **Déployer** : S'assurer que la dernière version est déployée

---

## 💡 Astuce

Si vous avez plusieurs environnements (staging, production), ajoutez toutes les URLs nécessaires dans chaque provider OAuth pour éviter de devoir modifier la configuration à chaque déploiement.

