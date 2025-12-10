# 🚀 Guide de déploiement en production

## Variables d'environnement en production

Le fichier `.env.local` n'est **JAMAIS** déployé en production (il est dans `.gitignore`). Vous devez configurer les variables d'environnement directement sur votre plateforme de déploiement.

## 🔧 Vercel (Recommandé pour Next.js)

### 1. Créer un projet sur Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Déployer (première fois)
vercel
```

### 2. Configurer les variables d'environnement

#### Via le Dashboard Vercel (Recommandé)

1. Allez sur [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **Settings** > **Environment Variables**
4. Ajoutez les variables suivantes :

```
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-clé-anon-ici
```

5. Sélectionnez les environnements : **Production**, **Preview**, **Development**
6. Cliquez sur **Save**
7. Redéployez votre application (les variables sont prises en compte au prochain déploiement)

#### Via la CLI Vercel

```bash
# Ajouter une variable pour la production
vercel env add NEXT_PUBLIC_SUPABASE_URL production

# Ajouter une variable pour tous les environnements
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# Lister les variables
vercel env ls

# Redéployer
vercel --prod
```

### 3. Redéploiement après modification

Après avoir ajouté/modifié des variables d'environnement, vous devez redéployer :

```bash
# Via CLI
vercel --prod

# Ou via le dashboard : Settings > Deployments > Redeploy
```

---

## 🌐 Autres plateformes

### Netlify

1. Allez sur [https://app.netlify.com](https://app.netlify.com)
2. Sélectionnez votre site
3. Allez dans **Site settings** > **Environment variables**
4. Ajoutez vos variables
5. Redéployez

### Railway

1. Allez sur [https://railway.app](https://railway.app)
2. Sélectionnez votre projet
3. Allez dans **Variables**
4. Ajoutez vos variables
5. Redéployez automatiquement

### Render

1. Allez sur [https://render.com](https://render.com)
2. Sélectionnez votre service
3. Allez dans **Environment**
4. Ajoutez vos variables
5. Redéployez

---

## 🔐 Variables à configurer

### Variables requises

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-clé-anon-ici
```

### ⚠️ IMPORTANT : Sécurité

1. **Ne JAMAIS** commiter `.env.local` dans Git
2. **Ne JAMAIS** utiliser la clé `service_role` côté client
3. Utilisez toujours la clé `anon` (publique) pour `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Les variables commençant par `NEXT_PUBLIC_` sont exposées au client (c'est normal pour Supabase anon key)
5. Les variables sans `NEXT_PUBLIC_` sont uniquement côté serveur

---

## 📋 Checklist de déploiement

### Avant le déploiement

- [ ] Vérifier que `.env.local` est dans `.gitignore`
- [ ] Vérifier que vous avez les bonnes clés Supabase (anon, pas service_role)
- [ ] Tester localement que l'application fonctionne

### Configuration sur la plateforme

- [ ] Ajouter `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Ajouter `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clé anon uniquement)
- [ ] Vérifier que les variables sont bien configurées pour la production

### Après le déploiement

- [ ] Vérifier que l'application se charge
- [ ] Tester la connexion/inscription
- [ ] Vérifier que les données se chargent depuis Supabase
- [ ] Vérifier la console du navigateur pour les erreurs

---

## 🐛 Dépannage

### Variables non prises en compte

1. **Redéployez** après avoir ajouté des variables
2. Vérifiez que les noms des variables sont exacts (case-sensitive)
3. Vérifiez que vous avez sélectionné le bon environnement (Production)

### Erreurs "Missing Supabase environment variables"

1. Vérifiez que les variables sont bien configurées sur la plateforme
2. Vérifiez que les noms commencent bien par `NEXT_PUBLIC_`
3. Redéployez après modification

### Erreur "Forbidden use of secret API key"

Vous avez mis la clé secrète au lieu de la clé anon. Changez `NEXT_PUBLIC_SUPABASE_ANON_KEY` pour utiliser la clé `anon` (pas `service_role`).

---

## 📚 Ressources

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Supabase Client Setup](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)

---

## 💡 Astuce : Variables par environnement

Sur Vercel, vous pouvez avoir différentes valeurs selon l'environnement :

- **Production** : URL/clés de production Supabase
- **Preview** : URL/clés de staging Supabase (optionnel)
- **Development** : URL/clés de dev Supabase (optionnel)

Cela vous permet d'avoir des environnements séparés pour le développement et la production.

