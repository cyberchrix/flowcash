import { supabase, ensureSupabaseConfigured } from "../supabase";
import { Database } from "@/types/database";
import { categoryEnglishName } from "@/lib/transactions/categoryNames";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"];
type CategoryUpdate = Database["public"]["Tables"]["categories"]["Update"];

const CATEGORY_ALIASES: Record<string, string> = {
  "child support": "Pensions",
  "convenience store": "Vie Quotidienne - Autres",
  credit: "Crédit conso",
  other: "Autres dépenses",
  salary: "Salaire fixe",
  shopping: "Autres dépenses",
  transport: "Voyages et Transports",
  transfers: "Virements émis",
  veterinary: "Animaux domestiques",
};

export function findCategoryByName<T extends { name: string; name_en?: string | null }>(categories: T[], name: string): T | null {
  const needle = name.trim().toLowerCase();
  const alias = CATEGORY_ALIASES[needle];
  if (alias) {
    const aliased = categories.find((category) => category.name.toLowerCase() === alias.toLowerCase());
    if (aliased) return aliased;
  }
  const byEnglish = categories.filter((category) => (category.name_en ?? "").toLowerCase() === needle);
  if (byEnglish.length === 1) return byEnglish[0];
  return categories.find((category) => category.name.toLowerCase() === needle) ?? null;
}

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

  const categories = data ?? [];

  await ensureCategoryTranslations(categories);
  return categories;
}

async function ensureCategoryTranslations(categories: Category[]) {
  for (const category of categories) {
    const english = categoryEnglishName(category.name);
    if (!english || (category.name_en && category.name_fr)) continue;
    const name_en = category.name_en || english;
    const name_fr = category.name_fr || category.name;
    const { error } = await supabase.from("categories").update({ name_en, name_fr }).eq("id", category.id);
    if (error) {
      if (/name_en|name_fr|column|schema cache/i.test(error.message)) return;
      throw new Error(`Error saving category translation: ${error.message}`);
    }
    category.name_en = name_en;
    category.name_fr = name_fr;
  }
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

export async function updateCategory(categoryId: string, updates: CategoryUpdate) {
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", categoryId)
    .select()
    .single();

  if (error) {
    throw new Error(`Error updating category: ${error.message}`);
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

