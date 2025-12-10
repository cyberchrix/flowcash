# Configuration des clés Supabase

## ⚠️ IMPORTANT : Différence entre les clés

### ✅ Clé Anonyme (ANON KEY) - À utiliser côté client
- Commence généralement par `eyJ...` (format JWT) ou `sb_anon_...`
- Peut être exposée dans le code frontend
- Utilisée dans `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Permissions limitées** (respecte les RLS policies)

### ❌ Clé Secrète (SERVICE ROLE KEY) - À NE JAMAIS utiliser côté client
- Commence par `sb_secret_...` ou contient `service_role`
- **NE JAMAIS** exposer dans le code frontend
- À utiliser uniquement dans des environnements backend sécurisés
- **Permissions complètes** (bypass les RLS policies)
- Si exposée = risque de sécurité majeur !

---

## 📍 Où trouver vos clés dans Supabase

1. Allez sur [https://app.supabase.com](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Settings** (⚙️) > **API**
4. Dans la section **Project API keys**, vous trouverez :
   - **`anon` `public`** → C'est la clé anonyme à utiliser ✅
   - **`service_role` `secret`** → NE PAS utiliser côté client ❌

---

## 🔧 Configuration dans `.env.local`

Votre fichier `.env.local` doit ressembler à ceci :

```env
# URL de votre projet Supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co

# Clé ANONYME (anon public) - commence par eyJ... ou sb_anon_...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ⚠️ NE JAMAIS mettre la clé service_role ici !
```

---

## 🔍 Comment reconnaître la bonne clé ?

### ✅ Clé anonyme (correcte)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
```
ou
```
sb_anon_...
```

### ❌ Clé secrète (incorrecte - erreur "Forbidden use of secret API key")
```
sb_secret_...
```
ou contient
```
service_role
```

---

## 🚨 Erreur : "Forbidden use of secret API key in browser"

Si vous voyez cette erreur, c'est que vous avez mis la **clé secrète** au lieu de la **clé anonyme** dans votre `.env.local`.

**Solution :**
1. Allez dans Supabase Dashboard > Settings > API
2. Copiez la clé **`anon` `public`** (pas `service_role`)
3. Remplacez `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans votre `.env.local`
4. Redémarrez votre serveur de développement (`npm run dev`)

---

## 📝 Exemple de configuration correcte

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://ctdvmfggdonhwwzxarpn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0ZHZtZmdnZG9uaHd3enhhcnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE1MjE2MDAsImV4cCI6MjA0NzA5NzYwMH0...
```

Note : Remplacez `...` par la vraie clé complète depuis votre dashboard Supabase.

