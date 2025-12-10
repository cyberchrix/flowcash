/**
 * Utilitaire pour tester la connexion à Supabase
 * Usage: Vérifier si Supabase est bien configuré
 */

import { supabase } from "./supabase";

export async function testSupabaseConnection() {
  try {
    // Test simple : essayer de se connecter
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("❌ Erreur de connexion Supabase:", error.message);
      return { connected: false, error: error.message };
    }

    console.log("✅ Supabase est connecté");
    return { connected: true, session: data.session };
  } catch (error) {
    console.error("❌ Erreur lors du test de connexion:", error);
    return { 
      connected: false, 
      error: error instanceof Error ? error.message : "Erreur inconnue" 
    };
  }
}

