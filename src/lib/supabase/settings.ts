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

export async function saveMonthStart(userId: string, monthStart: "salary" | "calendar") {
  ensureSupabaseConfigured();
  if (typeof window !== "undefined") window.localStorage.setItem("availo.month-start", monthStart);
  const { error } = await supabase.from("user_settings").update({ month_start: monthStart }).eq("user_id", userId);
  if (error && !/month_start|schema cache|column/i.test(error.message)) {
    throw new Error(`Error saving month start: ${error.message}`);
  }
}

export function storedMonthStart(): "salary" | "calendar" {
  if (typeof window === "undefined") return "salary";
  return window.localStorage.getItem("availo.month-start") === "calendar" ? "calendar" : "salary";
}

export async function loadMonthStart(userId: string): Promise<"salary" | "calendar"> {
  const settings = await getUserSettings(userId);
  const saved = (settings as { month_start?: string } | null)?.month_start;
  if (saved === "salary" || saved === "calendar") {
    if (typeof window !== "undefined") window.localStorage.setItem("availo.month-start", saved);
    return saved;
  }
  return storedMonthStart();
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

