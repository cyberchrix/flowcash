import { supabase, ensureSupabaseConfigured } from "../supabase";
import { LinkDraft, PlannedExpense, plannedOccurrence } from "@/lib/finance/reconcile";

export async function saveConfirmedLinks(
  userId: string,
  month: string,
  expenses: PlannedExpense[],
  links: LinkDraft[]
) {
  ensureSupabaseConfigured();
  for (const expense of expenses) {
    const occurrence = plannedOccurrence(expense, month);
    const confirmed = links.filter((link) => link.expenseId === expense.id && link.status === "confirmed");
    if (!occurrence || confirmed.length === 0) continue;

    const { data, error } = await supabase
      .from("expense_occurrences")
      .upsert(
        {
          user_id: userId,
          expense_id: expense.id,
          month,
          planned_cents: occurrence.plannedCents,
          expected_date: occurrence.expectedDate,
        },
        { onConflict: "expense_id,month" }
      )
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? "Could not save occurrence");

    for (const link of confirmed) {
      const { error: linkError } = await supabase.from("expense_transaction_links").upsert(
        {
          user_id: userId,
          transaction_id: link.transactionId,
          occurrence_id: data.id,
          allocated_cents: link.allocatedCents,
          status: "confirmed",
        },
        { onConflict: "transaction_id,occurrence_id" }
      );
      if (linkError) throw new Error(linkError.message);
    }
  }
}
