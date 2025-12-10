# Configuration OAuth (Google, Facebook, GitHub, Apple)

Ce guide explique comment configurer l'authentification OAuth avec Supabase pour votre application Availo.

## 📋 Prérequis

1. Un projet Supabase actif
2. Accès aux dashboards des providers OAuth (Google, Facebook, etc.)

---

## 🔧 Configuration dans Supabase

### 1. Activer les providers dans Supabase

1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Settings** > **Authentication** > **Providers**
4. Activez les providers souhaités (Google, Facebook, GitHub, Apple)

---

## 🌐 Google OAuth

### 1. Créer un projet Google Cloud

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Allez dans **APIs & Services** > **Credentials**
4. Cliquez sur **Create Credentials** > **OAuth client ID**
5. Sélectionnez **Web application**
6. Configurez :
   - **Name** : Availo
   - **Authorized JavaScript origins** :
     - `http://localhost:3000` (pour le développement)
     - `https://votre-domaine.vercel.app` (pour la production)
   - **Authorized redirect URIs** :
     - `https://votre-projet.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` (pour le développement)

### 2. Configurer dans Supabase

1. Dans Supabase Dashboard > **Settings** > **Authentication** > **Providers** > **Google**
2. Activez Google
3. Collez votre **Client ID** et **Client Secret** depuis Google Cloud Console
4. Sauvegardez

---

## 📘 Facebook OAuth

### 1. Créer une application Facebook

1. Allez sur [Facebook Developers](https://developers.facebook.com/)
2. Créez une nouvelle application (sélectionnez "Consumer" comme type d'app)
3. Allez dans **Settings** > **Basic** et complétez **TOUS** les champs requis :
   - **App Display Name** : Le nom de votre application (ex: "Availo")
   - **App Contact Email** : Votre email
   - **Privacy Policy URL** : URL de votre politique de confidentialité
     - Pour les tests, vous pouvez utiliser une URL temporaire comme `https://example.com/privacy`
     - Ou créer une page simple sur votre site
   - **Terms of Service URL** : URL de vos conditions d'utilisation
     - Pour les tests, vous pouvez utiliser `https://example.com/terms`
   - **Category** : Sélectionnez une catégorie (ex: "Utilities", "Finance")
   - **App Icon** : Ajoutez une icône (192x192px minimum, requis)
   - **App Domains** : Ajoutez vos domaines (sans https://) :
     - `votre-projet.supabase.co`
     - `votre-domaine.vercel.app`
     - `localhost` (pour le développement)
4. Allez dans **Products** > Ajoutez "Facebook Login" si ce n'est pas déjà fait
5. Allez dans **Products** > **Facebook Login** > **Settings**
6. Ajoutez les **Valid OAuth Redirect URIs** :
   - `https://votre-projet.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (pour le développement)
   - `https://localhost:3000/auth/callback` (si vous utilisez HTTPS en local)

### 2. Configurer dans Supabase

1. Dans Supabase Dashboard > **Settings** > **Authentication** > **Providers** > **Facebook**
2. Activez Facebook
3. Collez votre **App ID** et **App Secret** (disponibles dans **Settings** > **Basic**)
4. Sauvegardez

### ⚠️ Problème courant : "Fonctionnalité indisponible"

Si vous voyez le message "Facebook Login est actuellement indisponible", cela signifie généralement que :

1. **L'application Facebook n'est pas en mode "Public"** :
   - Allez dans **Settings** > **Basic** > **App Review**
   - Cliquez sur "Make [Your App Name] Live"
   - Complétez tous les champs requis (Privacy Policy, Terms of Service, etc.)

2. **Des informations manquantes dans les paramètres de base** :
   - Vérifiez que tous les champs requis sont remplis dans **Settings** > **Basic**
   - Assurez-vous d'avoir ajouté une icône d'application

3. **L'application est en mode "Développement"** :
   - Les apps en mode développement ont des restrictions
   - Passez en mode "Public" ou ajoutez des testeurs dans **Roles** > **Testers**

4. **Vérification en attente** :
   - Facebook peut mettre quelques minutes à activer l'application après les modifications
   - Attendez 5-10 minutes puis réessayez

---

## 🐙 GitHub OAuth

### 1. Créer une OAuth App GitHub

1. Allez sur [GitHub Developer Settings](https://github.com/settings/developers)
2. Cliquez sur **New OAuth App**
3. Configurez :
   - **Application name** : Availo
   - **Homepage URL** : `https://votre-domaine.vercel.app`
   - **Authorization callback URL** :
     - `https://votre-projet.supabase.co/auth/v1/callback`

### 2. Configurer dans Supabase

1. Dans Supabase Dashboard > **Settings** > **Authentication** > **Providers** > **GitHub**
2. Activez GitHub
3. Collez votre **Client ID** et **Client Secret**
4. Sauvegardez

---

## 🍎 Apple OAuth (Optionnel)

Apple nécessite une configuration plus complexe avec des certificats. Voir la [documentation Supabase](https://supabase.com/docs/guides/auth/social-login/auth-apple) pour les détails.

---

## 🔗 Configuration des URLs de redirection

### URLs à ajouter dans chaque provider :

- **Supabase Callback** (obligatoire) :
  - `https://votre-projet-id.supabase.co/auth/v1/callback`
  
- **Votre application** (pour le développement) :
  - `http://localhost:3000/auth/callback`
  
- **Votre application** (pour la production) :
  - `https://votre-domaine.vercel.app/auth/callback`

---

## ✅ Vérification

1. Testez chaque provider dans votre application
2. Vérifiez que la redirection fonctionne après l'authentification
3. Vérifiez que l'utilisateur est bien créé dans Supabase Dashboard > **Authentication** > **Users**

---

## 🐛 Dépannage

### Erreur Facebook : "Fonctionnalité indisponible"

**Symptôme** : Message d'erreur "Facebook Login est actuellement indisponible pour cette application car nous effectuons la mise à jour des informations supplémentaires pour l'application."

**Causes possibles** :
1. Des informations obligatoires manquent dans **Settings** > **Basic**
2. L'application est en mode "Development" et nécessite des testeurs
3. Facebook traite encore les informations après les modifications

**Solutions (dans l'ordre)** :

1. **Vérifier et compléter TOUS les champs dans Settings > Basic** :
   - ✅ **App Display Name** : Doit être rempli
   - ✅ **App Contact Email** : Doit être rempli et valide
   - ✅ **Privacy Policy URL** : **OBLIGATOIRE** - Même une URL temporaire fonctionne
     - Exemple : `https://votre-domaine.vercel.app/privacy` ou `https://example.com/privacy`
   - ✅ **Terms of Service URL** : **OBLIGATOIRE**
     - Exemple : `https://votre-domaine.vercel.app/terms` ou `https://example.com/terms`
   - ✅ **Category** : Sélectionnez une catégorie (ex: "Utilities")
   - ✅ **App Icon** : **OBLIGATOIRE** - Uploader une image (192x192px minimum)
   - ✅ **App Domains** : Ajoutez vos domaines (sans `https://`)

2. **Pour les tests en mode Development (sans rendre l'app publique)** :
   - Allez dans **Roles** > **Testers** (ou **Settings** > **Roles**)
   - Ajoutez votre propre compte Facebook comme testeur
   - Les testeurs peuvent utiliser Facebook Login même si l'app n'est pas publique
   - Pour ajouter des testeurs :
     - Cliquez sur "Add Testers"
     - Entrez l'email ou le nom Facebook
     - Le testeur doit accepter l'invitation

3. **Rendre l'application publique (optionnel, pour la production)** :
   - Allez dans **App Review** > **Permissions and Features** (dans le menu gauche)
   - Ou cherchez "Switch Mode" dans **Settings**
   - Changez le mode de "Development" à "Live"
   - Note : Cela nécessite que tous les champs soient remplis et que l'app soit prête

4. **Attendre la propagation** :
   - Après avoir rempli/complété les champs, attendez 5-10 minutes
   - Facebook peut mettre un peu de temps à traiter les changements
   - Rafraîchissez la page et réessayez

**Solution rapide pour tester** :
- Complétez tous les champs requis dans **Settings** > **Basic**
- Ajoutez-vous comme testeur dans **Roles** > **Testers**
- Attendez quelques minutes
- Réessayez la connexion Facebook

### Erreur "redirect_uri_mismatch"

**Cause** : L'URL de redirection dans votre provider ne correspond pas à celle configurée.

**Solution** : Vérifiez que vous avez bien ajouté `https://votre-projet.supabase.co/auth/v1/callback` dans les URLs autorisées du provider.

### L'utilisateur n'est pas créé automatiquement

**Cause** : Le trigger SQL n'a pas été exécuté.

**Solution** : Vérifiez que vous avez exécuté `supabase/seed-safe.sql` pour créer le trigger qui initialise les catégories.

### Erreur après redirection

**Cause** : La route `/auth/callback` n'existe pas ou n'est pas configurée correctement.

**Solution** : Vérifiez que le fichier `src/app/auth/callback/route.ts` existe et est correctement configuré.

---

## 📚 Ressources

- [Documentation Supabase OAuth](https://supabase.com/docs/guides/auth/social-login)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login Setup](https://developers.facebook.com/docs/facebook-login/)
- [GitHub OAuth Setup](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps)

