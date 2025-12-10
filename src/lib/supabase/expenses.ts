import { supabase, ensureSupabaseConfigured } from "../supabase";
import { Database } from "@/types/database";

type Expense = Database["public"]["Tables"]["expenses"]["Row"];
type ExpenseInsert = Database["public"]["Tables"]["expenses"]["Insert"];

export async function getExpenses(userId: string) {
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from("expenses")
    .select("*, categories(*)")
    .eq("user_id", userId)
    .order("expense_date", { ascending: false });

  if (error) {
    throw new Error(`Error fetching expenses: ${error.message}`);
  }

  return data;
}

export async function createExpense(expense: ExpenseInsert) {
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from("expenses")
    .insert(expense)
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating expense: ${error.message}`);
  }

  return data;
}

export async function deleteExpense(expenseId: string) {
  ensureSupabaseConfigured();
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId);

  if (error) {
    throw new Error(`Error deleting expense: ${error.message}`);
  }
}

export async function getExpensesByCategory(userId: string) {
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from("expenses")
    .select("*, categories(name, color)")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Error fetching expenses by category: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Type for category totals
  type CategoryTotal = { name: string; total: number; color: string };

  // Group by category and calculate totals
  const grouped = data.reduce((acc, expense) => {
    const category = expense.categories as { name: string; color: string } | null;
    const categoryName = category?.name || "Other";
    const categoryColor = category?.color || "#A1A1A1";
    
    if (!acc[categoryName]) {
      acc[categoryName] = {
        name: categoryName,
        total: 0,
        color: categoryColor,
      };
    }
    acc[categoryName].total += Number(expense.amount);
    return acc;
  }, {} as Record<string, CategoryTotal>);

  // Calculate total expenses
  const categoryValues: CategoryTotal[] = Object.values(grouped);
  const totalExpenses = categoryValues.reduce(
    (sum, cat) => sum + cat.total,
    0
  );

  // Convert to array and calculate percentages
  return categoryValues.map((cat) => ({
    ...cat,
    percent: totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0,
  }));
}

