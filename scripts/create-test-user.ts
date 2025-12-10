/**
 * Script pour créer un utilisateur de test dans Supabase Auth
 * Usage: npm run create-test-user
 * 
 * Ce script crée un utilisateur de test avec un email et mot de passe fixe
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Erreur: Variables d'environnement Supabase manquantes");
  console.error("Assurez-vous d'avoir un fichier .env.local avec NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Informations de l'utilisateur de test
const TEST_EMAIL = "test@availo.local";
const TEST_PASSWORD = "test123456";

async function createTestUser() {
  console.log("🔐 Création d'un utilisateur de test...\n");

  try {
    // Vérifier si l'utilisateur existe déjà
    const { data: existingUsers, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (existingUsers?.user && !signInError) {
      console.log("✅ Utilisateur de test existe déjà!");
      console.log(`\n📋 USER_ID: ${existingUsers.user.id}`);
      console.log(`📧 Email: ${TEST_EMAIL}`);
      console.log(`🔑 Mot de passe: ${TEST_PASSWORD}`);
      console.log(`\n💡 Ajoutez ceci dans votre .env.local:`);
      console.log(`   USER_ID=${existingUsers.user.id}`);
      return;
    }

    // Créer un nouvel utilisateur
    console.log("Création d'un nouvel utilisateur de test...");
    const { data: newUser, error: signUpError } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      options: {
        emailRedirectTo: `${supabaseUrl}/auth/callback`,
      },
    });

    if (signUpError) {
      console.error("❌ Erreur lors de la création de l'utilisateur:", signUpError.message);
      
      if (signUpError.message.includes("already registered")) {
        console.log("\n💡 L'utilisateur existe déjà. Connectez-vous manuellement pour obtenir le USER_ID.");
        console.log("   Ou utilisez la console du navigateur après connexion:");
        console.log(`   supabase.auth.signInWithPassword({ email: "${TEST_EMAIL}", password: "${TEST_PASSWORD}" })`);
      }
      process.exit(1);
    }

    if (!newUser?.user) {
      console.error("❌ Échec de la création de l'utilisateur");
      process.exit(1);
    }

    console.log("✅ Utilisateur de test créé avec succès!\n");
    console.log(`📋 USER_ID: ${newUser.user.id}`);
    console.log(`📧 Email: ${TEST_EMAIL}`);
    console.log(`🔑 Mot de passe: ${TEST_PASSWORD}`);
    console.log(`\n💡 Ajoutez ceci dans votre .env.local:`);
    console.log(`   USER_ID=${newUser.user.id}`);
    console.log(`\n⚠️  Note: Si l'email confirmation est activée dans Supabase,`);
    console.log(`   vous devrez peut-être confirmer l'email ou désactiver la confirmation`);
    console.log(`   dans les paramètres de votre projet Supabase.`);

  } catch (error) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  }
}

// Exécuter le script
createTestUser();

