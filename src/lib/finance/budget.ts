import { DateRange, daysInMonth, formatISODate, inclusiveDays, monthRange, monthsTouched, overlaps, parseISODate } from "./period";

export type BudgetStatus = "on_track" | "at_risk" | "over" | "none";

export type MonthBudget = {
  month: string;
  amountCents: number;
  active: boolean;
  forecast: "variable" | "fixed";
};

export function budgetForMonth(budgets: MonthBudget[], month: string): MonthBudget | null {
  return budgets.find((budget) => budget.month === month && budget.active) ?? null;
}

export function proratedAllowance(budgets: MonthBudget[], range: DateRange): { cents: number; prorated: boolean } {
  let cents = 0;
  let prorated = false;
  for (const month of monthsTouched(range)) {
    const budget = budgetForMonth(budgets, month);
    if (!budget) continue;
    const date = parseISODate(month);
    const full = monthRange(date.getUTCFullYear(), date.getUTCMonth() + 1);
    const overlap = overlaps(range, full);
    if (!overlap) continue;
    const overlapDays = inclusiveDays(overlap.start, overlap.end);
    const monthDays = daysInMonth(date.getUTCFullYear(), date.getUTCMonth() + 1);
    if (overlapDays !== monthDays) prorated = true;
    cents += Math.round((budget.amountCents * overlapDays) / monthDays);
  }
  return { cents, prorated };
}

export function consumedPercent(spentCents: number, budgetCents: number | null): number | null {
  if (budgetCents == null || budgetCents === 0) return null;
  return Math.round((spentCents / budgetCents) * 1000) / 10;
}

export function budgetStatus(
  spentCents: number,
  budgetCents: number | null,
  elapsedRatio: number
): BudgetStatus {
  if (budgetCents == null) return "none";
  if (budgetCents === 0) return spentCents > 0 ? "over" : "on_track";
  if (spentCents > budgetCents) return "over";
  const used = spentCents / budgetCents;
  if (used >= 0.9 || used > elapsedRatio + 0.1) return "at_risk";
  return "on_track";
}

export type PlannedCharge = {
  categoryId: string | null;
  amountCents: number;
  type: "fixed_recurring" | "fixed_once" | "variable";
  active: boolean;
  day: number;
  onceMonth: string | null;
};

function dueDate(year: number, month: number, day: number): string {
  const clamped = Math.min(Math.max(day, 1), daysInMonth(year, month));
  return formatISODate(new Date(Date.UTC(year, month - 1, clamped)));
}

/** Fixed expense amounts whose due date falls in the range. Variable expenses are excluded. */
export function fixedPlannedCents(
  charges: PlannedCharge[],
  range: DateRange
): { cents: number; byCategory: Map<string, number> } {
  const byCategory = new Map<string, number>();
  let cents = 0;
  for (const charge of charges) {
    if (!charge.active || charge.type === "variable" || charge.amountCents <= 0) continue;
    for (const month of monthsTouched(range)) {
      if (charge.type === "fixed_once" && charge.onceMonth !== month) continue;
      const date = parseISODate(month);
      const due = dueDate(date.getUTCFullYear(), date.getUTCMonth() + 1, charge.day);
      if (due < range.start || due > range.end) continue;
      cents += charge.amountCents;
      if (charge.categoryId) {
        byCategory.set(charge.categoryId, (byCategory.get(charge.categoryId) ?? 0) + charge.amountCents);
      }
    }
  }
  return { cents, byCategory };
}

export function statusLabel(status: BudgetStatus): string {
  if (status === "on_track") return "On track";
  if (status === "at_risk") return "At risk";
  if (status === "over") return "Over budget";
  return "No budget configured";
}
