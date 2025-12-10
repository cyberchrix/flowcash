/**
 * Client Supabase côté client pour utilisation dans la console du navigateur
 * 
 * Pour obtenir votre USER_ID dans la console :
 * 
 * 1. Ouvrez la console du navigateur (F12)
 * 2. Exécutez :
 *    fetch('/api/auth/user').then(r => r.json()).then(d => {
 *      if (d.id) {
 *        console.log('✅ USER_ID:', d.id);
 *        console.log('📋 Copiez cette valeur dans votre .env.local:');
 *        console.log(`   USER_ID=${d.id}`);
 *      } else {
 *        console.log('❌ Non connecté. Connectez-vous d\'abord.');
 *      }
 *    });
 * 
 * Ou utilisez directement le hook useAuth dans un composant React.
 */

import { createClient } from "@supabase/supabase-js";

export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

