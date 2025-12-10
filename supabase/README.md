# Supabase Database Setup

Ce dossier contient les scripts SQL pour configurer votre base de données Supabase.

## Tables créées

### 1. `categories`
Stocke les catégories de dépenses pour chaque utilisateur.
- `id` : UUID unique
- `name` : Nom de la catégorie (ex: "Housing")
- `color` : Code couleur hexadécimal (ex: "#FF2D8A")
- `user_id` : Référence vers l'utilisateur
- `created_at`, `updated_at` : Timestamps

### 2. `expenses`
Stocke les dépenses individuelles.
- `id` : UUID unique
- `user_id` : Référence vers l'utilisateur
- `label` : Libellé de la dépense
- `amount` : Montant de la dépense
- `currency` : Code devise (EUR, USD, GBP)
- `category_id` : Référence vers la catégorie
- `expense_date` : Date de la dépense
- `created_at`, `updated_at` : Timestamps

### 3. `user_settings`
Stocke les paramètres utilisateur (salaire net, devise par défaut).
- `id` : UUID unique
- `user_id` : Référence vers l'utilisateur (unique)
- `salary_net` : Salaire net
- `currency` : Devise par défaut
- `created_at`, `updated_at` : Timestamps

## Installation

1. **Connectez-vous à votre projet Supabase** : https://app.supabase.com

2. **Ouvrez l'éditeur SQL** : Allez dans SQL Editor dans le menu de gauche

3. **Exécutez le schéma** :
   - Copiez le contenu de `schema.sql`
   - Collez-le dans l'éditeur SQL
   - Cliquez sur "Run" pour exécuter

4. **Exécutez le seed** (optionnel) :
   - Copiez le contenu de `seed.sql`
   - Collez-le dans l'éditeur SQL
   - Cliquez sur "Run" pour exécuter

Le script `seed.sql` créera automatiquement les catégories par défaut pour chaque nouvel utilisateur qui s'inscrit.

## Row Level Security (RLS)

Toutes les tables ont RLS activé avec des politiques qui garantissent que :
- Les utilisateurs ne peuvent voir que leurs propres données
- Les utilisateurs ne peuvent modifier que leurs propres données

## Notes importantes

- Les utilisateurs sont gérés par Supabase Auth (`auth.users`)
- Le trigger `on_auth_user_created` crée automatiquement les catégories par défaut lors de l'inscription
- Tous les montants sont stockés en DECIMAL(10, 2) pour la précision

