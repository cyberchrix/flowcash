# Comment obtenir votre USER_ID

## Méthode recommandée : Utiliser le script create-test-user

C'est la méthode la plus simple :

```bash
npm run create-test-user
```

Le script créera un utilisateur de test et affichera automatiquement le USER_ID.

---

## Méthode alternative : Via la console du navigateur

Si vous êtes déjà connecté à l'application :

1. **Ouvrez votre application** dans le navigateur (http://localhost:3000)

2. **Ouvrez la console du navigateur** (F12 ou Cmd+Option+I sur Mac)

3. **Dans la console, collez et exécutez** :

```javascript
// Méthode simple via l'API
fetch('/api/auth/user')
  .then(r => r.json())
  .then(data => {
    if (data.id) {
      console.log('✅ USER_ID trouvé:', data.id);
      console.log('\n📋 Ajoutez ceci dans votre .env.local:');
      console.log(`USER_ID=${data.id}`);
      // Copier automatiquement dans le presse-papier (si supporté)
      navigator.clipboard?.writeText(`USER_ID=${data.id}`).then(() => {
        console.log('✅ Copié dans le presse-papier!');
      });
    } else {
      console.log('❌ Non connecté. Connectez-vous d\'abord à l\'application.');
    }
  })
  .catch(err => console.error('Erreur:', err));
```

4. **Copiez le USER_ID affiché** et ajoutez-le dans votre `.env.local` :
   ```env
   USER_ID=votre-user-id-ici
   ```

---

## Si vous n'êtes pas connecté

1. **Créez un compte** dans votre application
2. **Connectez-vous**
3. **Utilisez la méthode ci-dessus** pour obtenir votre USER_ID

---

## Vérifier que le USER_ID fonctionne

Après avoir ajouté le USER_ID dans `.env.local`, testez le script de seed :

```bash
npm run seed
```

Si tout fonctionne, vous verrez les données mock être ajoutées dans votre base Supabase.

