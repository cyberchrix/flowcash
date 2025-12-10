import { supabase, ensureSupabaseConfigured } from "../supabase";
import { Database } from "@/types/database";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"];

export async function getCategories(userId: string) {
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Error fetching categories: ${error.message}`);
  }

  return data;
}

export async function createCategory(category: CategoryInsert) {
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from("categories")
    .insert(category)
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating category: ${error.message}`);
  }

  return data;
}

export async function deleteCategory(categoryId: string) {
  ensureSupabaseConfigured();
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId);

  if (error) {
    throw new Error(`Error deleting category: ${error.message}`);
  }
}

