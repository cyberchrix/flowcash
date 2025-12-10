/**
 * Script pour ajouter des données mock dans Supabase
 * Usage: npm run seed
 *        ou
 *        USER_ID=votre-user-id npm run seed
 * 
 * Pour obtenir votre USER_ID:
 * 1. Connectez-vous à votre app
 * 2. Ouvrez la console du navigateur
 * 3. Exécutez: await supabase.auth.getUser().then(r => console.log(r.data.user?.id))
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const USER_ID = process.env.USER_ID;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Erreur: Variables d'environnement Supabase manquantes");
  console.error("Assurez-vous d'avoir un fichier .env.local avec NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

if (!USER_ID) {
  console.error("❌ Erreur: USER_ID manquant");
  console.error("\n💡 Pour obtenir votre USER_ID:");
  console.error("   1. Connectez-vous à votre application");
  console.error("   2. Ouvrez la console du navigateur (F12)");
  console.error("   3. Exécutez:");
  console.error('      await fetch("/api/auth/user").then(r => r.json()).then(d => console.log(d.id))');
  console.error("\n   Ou utilisez: USER_ID=votre-user-id npm run seed");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seedMockData() {
  console.log("🌱 Démarrage du seed des données mock...\n");
  console.log(`👤 Utilisateur: ${USER_ID}\n`);

  try {
    // 1. Vérifier/Créer les catégories
    console.log("1️⃣  Vérification des catégories...");
    const { data: existingCategories } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", USER_ID);

    const categoriesMap: Record<string, string> = {};

    if (existingCategories && existingCategories.length > 0) {
      console.log(`✅ ${existingCategories.length} catégorie(s) existante(s) trouvée(s)`);
      existingCategories.forEach((cat) => {
        categoriesMap[cat.name] = cat.id;
      });
    } else {
      console.log("   Aucune catégorie trouvée, création des catégories par défaut...");
      const defaultCategories = [
        { name: "Housing", color: "#FF2D8A" },
        { name: "Children", color: "#8A2BFF" },
        { name: "Subscriptions", color: "#316CFF" },
        { name: "Transport", color: "#FFC04A" },
        { name: "Other", color: "#A1A1A1" },
      ];

      for (const cat of defaultCategories) {
        const { data, error } = await supabase
          .from("categories")
          .insert({
            user_id: USER_ID,
            name: cat.name,
            color: cat.color,
          })
          .select()
          .single();

        if (error) {
          console.error(`❌ Erreur lors de la création de la catégorie ${cat.name}:`, error.message);
        } else {
          categoriesMap[cat.name] = data.id;
          console.log(`   ✅ Catégorie "${cat.name}" créée`);
        }
      }
    }
    console.log("");

    // 2. Mettre à jour/Créer les paramètres utilisateur
    console.log("2️⃣  Configuration du salaire...");
    const salaryNet = 4645;

    const { data: existingSettings } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", USER_ID)
      .single();

    if (existingSettings) {
      const { error } = await supabase
        .from("user_settings")
        .update({ salary_net: salaryNet, currency: "EUR" })
        .eq("user_id", USER_ID);

      if (error) {
        console.error("❌ Erreur lors de la mise à jour des paramètres:", error.message);
      } else {
        console.log(`✅ Salaire net mis à jour: ${salaryNet} €`);
      }
    } else {
      const { error } = await supabase
        .from("user_settings")
        .insert({
          user_id: USER_ID,
          salary_net: salaryNet,
          currency: "EUR",
        });

      if (error) {
        console.error("❌ Erreur lors de la création des paramètres:", error.message);
      } else {
        console.log(`✅ Salaire net configuré: ${salaryNet} €`);
      }
    }
    console.log("");

    // 3. Ajouter des dépenses mock
    console.log("3️⃣  Ajout des dépenses mock...");
    
    const mockExpenses = [
      { label: "Loyer mensuel", amount: 2090.25, category: "Housing" },
      { label: "Courses", amount: 250.50, category: "Children" },
      { label: "Netflix", amount: 15.99, category: "Subscriptions" },
      { label: "Spotify", amount: 9.99, category: "Subscriptions" },
      { label: "Abonnement transport", amount: 75.00, category: "Transport" },
      { label: "Carburant", amount: 80.00, category: "Transport" },
      { label: "Restaurant", amount: 45.00, category: "Other" },
      { label: "Assurance habitation", amount: 85.50, category: "Housing" },
      { label: "École enfants", amount: 350.00, category: "Children" },
      { label: "Amazon Prime", amount: 49.90, category: "Subscriptions" },
    ];

    // Supprimer les anciennes dépenses pour recommencer proprement (optionnel)
    // Décommentez la ligne suivante si vous voulez réinitialiser les dépenses
    // await supabase.from("expenses").delete().eq("user_id", USER_ID);

    let addedCount = 0;
    for (const expense of mockExpenses) {
      const categoryId = categoriesMap[expense.category];
      if (!categoryId) {
        console.warn(`⚠️  Catégorie "${expense.category}" non trouvée, dépense ignorée`);
        continue;
      }

      // Générer une date aléatoire dans les 30 derniers jours
      const daysAgo = Math.floor(Math.random() * 30);
      const expenseDate = new Date();
      expenseDate.setDate(expenseDate.getDate() - daysAgo);

      const { error } = await supabase.from("expenses").insert({
        user_id: USER_ID,
        label: expense.label,
        amount: expense.amount,
        currency: "EUR",
        category_id: categoryId,
        expense_date: expenseDate.toISOString().split("T")[0],
      });

      if (error) {
        console.error(`❌ Erreur lors de l'ajout de "${expense.label}":`, error.message);
      } else {
        addedCount++;
        console.log(`   ✅ "${expense.label}" - ${expense.amount} €`);
      }
    }

    console.log(`\n✅ ${addedCount} dépense(s) ajoutée(s) avec succès!\n`);

    // 4. Résumé
    console.log("📊 Résumé:");
    const { data: totalExpenses } = await supabase
      .from("expenses")
      .select("amount")
      .eq("user_id", USER_ID);

    const total = totalExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
    console.log(`   Salaire net: ${salaryNet} €`);
    console.log(`   Total des dépenses: ${total.toFixed(2)} €`);
    console.log(`   Revenu disponible: ${(salaryNet - total).toFixed(2)} €`);
    console.log(`\n🎉 Seed terminé avec succès!`);

  } catch (error) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  }
}

// Exécuter le script
seedMockData();

