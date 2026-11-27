import { supabase, ensureSupabaseConfigured } from "../supabase";
import { Database } from "@/types/database";
import { categoryEnglishName } from "@/lib/transactions/categoryNames";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"];
type CategoryUpdate = Database["public"]["Tables"]["categories"]["Update"];

const APP_CATEGORIES = [
  { name: "Car insurance", color: "#0EA5E9" },
  { name: "Cash withdrawals", color: "#64748B" },
  { name: "Bank fees", color: "#94A3B8" },
  { name: "Veterinary", color: "#14B8A6" },
  { name: "Child support", color: "#FB923C" },
  { name: "Travel", color: "#38BDF8" },
  { name: "Leisure", color: "#818CF8" },
  { name: "Gifts", color: "#F9A8D4" },
];

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
  for (const item of APP_CATEGORIES) {
    if (categories.some((category) => category.name.toLowerCase() === item.name.toLowerCase())) continue;
    try {
      categories.push(await createCategory({ user_id: userId, name: item.name, color: item.color }));
    } catch (error) {
      if (!(error instanceof Error) || !/duplicate|unique/i.test(error.message)) throw error;
    }
  }

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

