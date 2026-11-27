import { supabase, ensureSupabaseConfigured } from "../supabase";

export type MonthOpening = { month: string; amountCents: number };

function missingTable(message: string) {
  return /month_opening_balances|schema cache/i.test(message);
}

export async function getMonthOpenings(userId: string): Promise<MonthOpening[]> {
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from("month_opening_balances")
    .select("month, amount_cents")
    .eq("user_id", userId);
  if (error) {
    if (missingTable(error.message)) return [];
    throw new Error(`Error fetching opening balances: ${error.message}`);
  }
  return (data ?? []).map((row) => ({
    month: String(row.month).slice(0, 7),
    amountCents: Number(row.amount_cents),
  }));
}

export async function saveMonthOpening(userId: string, month: string, amountCents: number) {
  ensureSupabaseConfigured();
  const { error } = await supabase.from("month_opening_balances").upsert(
    { user_id: userId, month: `${month}-01`, amount_cents: amountCents },
    { onConflict: "user_id,month" },
  );
  if (error) {
    if (missingTable(error.message)) {
      throw new Error("Run supabase/migrations/add_month_opening_balances.sql to save a starting balance.");
    }
    throw new Error(`Error saving opening balance: ${error.message}`);
  }
}

export async function deleteMonthOpening(userId: string, month: string) {
  ensureSupabaseConfigured();
  const { error } = await supabase
    .from("month_opening_balances")
    .delete()
    .eq("user_id", userId)
    .eq("month", `${month}-01`);
  if (error) {
    if (missingTable(error.message)) {
      throw new Error("Run supabase/migrations/add_month_opening_balances.sql to save a starting balance.");
    }
    throw new Error(`Error clearing opening balance: ${error.message}`);
  }
}
