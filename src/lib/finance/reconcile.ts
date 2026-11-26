import { daysInMonth, formatISODate, parseISODate } from "./period";
import { SpendingTransaction } from "./spending";

export type ExpenseType = "fixed_recurring" | "fixed_once" | "variable";
export type MatchMode = "merchant" | "category" | "manual" | "none";
export type ExpenseStatus =
  | "pending"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "over_budget"
  | "within_budget"
  | "unmatched";

export type PlannedExpense = {
  id: string;
  type: ExpenseType;
  amountCents: number;
  categoryId: string | null;
  day: number;
  active: boolean;
  matchMode: MatchMode;
  matchPattern: string | null;
  amountToleranceCents: number;
  dateToleranceDays: number;
  currency: string;
  onceMonth: string | null;
};

export type LinkDraft = {
  expenseId: string;
  transactionId: string;
  allocatedCents: number;
  status: "suggested" | "confirmed";
};

function expectedDate(month: string, day: number): string {
  const date = parseISODate(month);
  const last = daysInMonth(date.getUTCFullYear(), date.getUTCMonth() + 1);
  return formatISODate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), Math.min(day, last))));
}

export function plannedOccurrence(expense: PlannedExpense, month: string) {
  if (!expense.active) return null;
  if (expense.type === "variable") return null;
  if (expense.type === "fixed_once" && expense.onceMonth !== month) return null;
  return {
    expenseId: expense.id,
    month,
    plannedCents: expense.amountCents,
    expectedDate: expectedDate(month, expense.day),
  };
}

function daysApart(a: string, b: string): number {
  return Math.abs(Math.round((parseISODate(a).getTime() - parseISODate(b).getTime()) / 86_400_000));
}

export function suggestLinks(
  expenses: PlannedExpense[],
  transactions: SpendingTransaction[],
  month: string,
  confirmedTransactionIds: Set<string>
): LinkDraft[] {
  const drafts: LinkDraft[] = [];
  const claimed = new Set(confirmedTransactionIds);

  for (const expense of expenses) {
    const occurrence = plannedOccurrence(expense, month);
    if (!occurrence || expense.matchMode === "none" || expense.matchMode === "manual") continue;
    const candidates = transactions.filter((transaction) => {
      if (claimed.has(transaction.id) || transaction.currency !== expense.currency) return false;
      if (transaction.kind === "income") return false;
      if (daysApart(transaction.date, occurrence.expectedDate) > expense.dateToleranceDays) return false;
      const amount = Math.abs(transaction.amountCents);
      const withinAmount = Math.abs(amount - occurrence.plannedCents) <= expense.amountToleranceCents || amount < occurrence.plannedCents;
      if (!withinAmount) return false;
      if (expense.matchMode === "merchant") {
        const pattern = (expense.matchPattern ?? "").toUpperCase();
        return pattern.length > 0 && transaction.merchant.toUpperCase().includes(pattern);
      }
      return expense.categoryId != null && transaction.categoryId === expense.categoryId;
    });

    const unambiguous =
      candidates.length === 1 &&
      Math.abs(Math.abs(candidates[0].amountCents) - occurrence.plannedCents) <= expense.amountToleranceCents;

    for (const candidate of candidates) {
      drafts.push({
        expenseId: expense.id,
        transactionId: candidate.id,
        allocatedCents: Math.min(Math.abs(candidate.amountCents), occurrence.plannedCents),
        status: unambiguous ? "confirmed" : "suggested",
      });
      if (unambiguous) claimed.add(candidate.id);
    }
  }

  return drafts;
}

export function expenseStatus(input: {
  type: ExpenseType;
  plannedCents: number;
  actualCents: number;
  expectedDate: string | null;
  today: string;
  matched: boolean;
}): ExpenseStatus {
  if (input.type === "variable") {
    if (input.plannedCents <= 0) return "unmatched";
    return input.actualCents > input.plannedCents ? "over_budget" : "within_budget";
  }
  if (!input.matched && input.actualCents === 0) {
    if (input.expectedDate && input.today > input.expectedDate) return "overdue";
    return "pending";
  }
  if (input.actualCents <= 0) return input.matched ? "unmatched" : "pending";
  if (input.actualCents + 1 < input.plannedCents) return "partially_paid";
  return "paid";
}

export function allocationFits(transactionCents: number, alreadyAllocated: number, next: number): boolean {
  return alreadyAllocated + next <= Math.abs(transactionCents);
}
