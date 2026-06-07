import { supabase, ensureSupabaseConfigured } from "../supabase";
import { Database } from "@/types/database";

type Snapshot = Database["public"]["Tables"]["monthly_snapshots"]["Row"];

// First day of the current month as "YYYY-MM-01"
function currentMonthKey(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${mm}-01`;
}

export async function getSnapshots(userId: string): Promise<Snapshot[]> {
  ensureSupabaseConfigured();
  const { data, error } = await supabase
    .from("monthly_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("month", { ascending: true });

  if (error) {
    throw new Error(`Error fetching snapshots: ${error.message}`);
  }

  return (data ?? []) as Snapshot[];
}

// Create or update the snapshot for the current month.
// Resilient: never throws (the feature degrades gracefully if the table is
// missing or the write fails), it only logs the error.
export async function upsertCurrentMonthSnapshot(
  userId: string,
  values: { netIncome: number; totalExpenses: number; available: number }
): Promise<void> {
  if (!userId) return;

  try {
    ensureSupabaseConfigured();
    const { error } = await supabase.from("monthly_snapshots").upsert(
      {
        user_id: userId,
        month: currentMonthKey(),
        net_income: values.netIncome,
        total_expenses: values.totalExpenses,
        available: values.available,
      },
      { onConflict: "user_id,month" }
    );

    if (error) {
      console.error("Error saving monthly snapshot:", error.message);
    }
  } catch (error) {
    console.error("Error saving monthly snapshot:", error);
  }
}
