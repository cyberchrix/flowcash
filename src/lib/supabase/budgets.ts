import { supabase, ensureSupabaseConfigured } from "../supabase";
import { Database } from "@/types/database";

export type CategoryBudget = Database["public"]["Tables"]["category_budgets"]["Row"];

async function assertCategoryOwner(userId: string, categoryId: string) {
  const { data, error } = await supabase
    .from("categories")
    .select("id, user_id")
    .eq("id", categoryId)
    .single();
  if (error || !data || data.user_id !== userId) {
    throw new Error("This category does not belong to the current user.");
  }
}

export async function getCategoryBudgets(userId: string, currency = "EUR") {
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from("category_budgets")
    .select("*")
    .eq("user_id", userId)
    .eq("currency", currency)
    .order("effective_month", { ascending: true });
  if (error) throw new Error(`Error fetching budgets: ${error.message}`);
  return (data ?? []) as CategoryBudget[];
}

export async function saveCategoryBudget(input: {
  userId: string;
  categoryId: string;
  amountCents: number;
  currency: string;
  effectiveMonth: string;
  active?: boolean;
  forecast?: "variable" | "fixed";
}) {
  await assertCategoryOwner(input.userId, input.categoryId);
  ensureSupabaseConfigured();
  const { error } = await supabase.from("category_budgets").upsert(
    {
      user_id: input.userId,
      category_id: input.categoryId,
      amount_cents: input.amountCents,
      currency: input.currency,
      effective_month: input.effectiveMonth,
      active: input.active ?? true,
      forecast: input.forecast ?? "variable",
    },
    { onConflict: "user_id,category_id,currency,effective_month" }
  );
  if (error) throw new Error(`Error saving budget: ${error.message}`);
}

export async function deleteCategoryBudget(userId: string, budgetId: string) {
  ensureSupabaseConfigured();
  const { error } = await supabase
    .from("category_budgets")
    .delete()
    .eq("id", budgetId)
    .eq("user_id", userId);
  if (error) throw new Error(`Error deleting budget: ${error.message}`);
}

export async function duplicateBudgets(userId: string, fromMonth: string, toMonth: string, currency: string) {
  const budgets = await getCategoryBudgets(userId, currency);
  const source = budgets.filter((budget) => budget.effective_month === fromMonth);
  for (const budget of source) {
    await saveCategoryBudget({
      userId,
      categoryId: budget.category_id,
      amountCents: budget.amount_cents,
      currency,
      effectiveMonth: toMonth,
      active: budget.active,
      forecast: budget.forecast,
    });
  }
  return source.length;
}
