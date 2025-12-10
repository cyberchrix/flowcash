import { supabase, ensureSupabaseConfigured } from "../supabase";
import { Database } from "@/types/database";

type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];
type UserSettingsInsert = Database["public"]["Tables"]["user_settings"]["Insert"];
type UserSettingsUpdate = Database["public"]["Tables"]["user_settings"]["Update"];

export async function getUserSettings(userId: string) {
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    // If settings don't exist, create default ones
    if (error.code === "PGRST116") {
      const defaultSettings: UserSettingsInsert = {
        user_id: userId,
        salary_net: 0,
        currency: "EUR",
      };
      return createUserSettings(defaultSettings);
    }
    throw new Error(`Error fetching user settings: ${error.message}`);
  }

  return data;
}

export async function createUserSettings(settings: UserSettingsInsert) {
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from("user_settings")
    .insert(settings)
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating user settings: ${error.message}`);
  }

  return data;
}

export async function updateUserSettings(
  userId: string,
  settings: UserSettingsUpdate
) {
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from("user_settings")
    .update(settings)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Error updating user settings: ${error.message}`);
  }

  return data;
}

