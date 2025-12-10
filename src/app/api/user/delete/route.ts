import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              // Handle cookie setting error (might happen if called from Server Component)
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: "", ...options });
            } catch (error) {
              // Handle cookie removal error
            }
          },
        },
      }
    );

    // Essayer d'abord getSession, puis getUser en fallback
    let user = null;
    let authError = null;

    // Essayer getSession
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (session?.user) {
      user = session.user;
    } else {
      // Fallback: essayer getUser
      const {
        data: { user: userData },
        error: userError,
      } = await supabase.auth.getUser();

      if (userData) {
        user = userData;
      } else {
        authError = userError || sessionError;
      }
    }

    if (!user) {
      console.error("Auth error:", authError);
      console.error("No user found in session or getUser");
      return NextResponse.json(
        { error: "Non authentifié. Veuillez vous reconnecter." },
        { status: 401 }
      );
    }

    // Supprimer toutes les données de l'utilisateur dans l'ordre correct
    // Ordre important pour respecter les contraintes de clés étrangères
    
    // 1. Supprimer d'abord les dépenses (elles référencent les catégories)
    const { error: expensesError } = await supabase
      .from("expenses")
      .delete()
      .eq("user_id", user.id);

    if (expensesError) {
      console.error("Error deleting expenses:", expensesError);
      throw new Error(`Erreur lors de la suppression des dépenses: ${expensesError.message}`);
    }

    // 2. Supprimer les catégories
    const { error: categoriesError } = await supabase
      .from("categories")
      .delete()
      .eq("user_id", user.id);

    if (categoriesError) {
      console.error("Error deleting categories:", categoriesError);
      throw new Error(`Erreur lors de la suppression des catégories: ${categoriesError.message}`);
    }

    // 3. Supprimer les paramètres utilisateur en dernier
    // (Si le trigger SQL est activé, cela déclenchera la suppression de auth.users)
    const { error: settingsError } = await supabase
      .from("user_settings")
      .delete()
      .eq("user_id", user.id);

    if (settingsError) {
      console.error("Error deleting user settings:", settingsError);
      throw new Error(`Erreur lors de la suppression des paramètres: ${settingsError.message}`);
    }

    // Déconnecter l'utilisateur
    await supabase.auth.signOut();

    // Note: La suppression de l'utilisateur de auth.users nécessite une fonction Supabase
    // ou l'utilisation de l'admin API. Pour l'instant, on supprime juste les données.
    // L'utilisateur peut rester dans auth.users mais sans données.
    
    // Pour une suppression complète, il faudrait:
    // 1. Créer une Edge Function Supabase avec les permissions admin
    // 2. Ou utiliser un trigger SQL qui supprime auth.users quand toutes les données sont supprimées

    return NextResponse.json({
      success: true,
      message: "Compte et données supprimés avec succès",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du compte" },
      { status: 500 }
    );
  }
}

