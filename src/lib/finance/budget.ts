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
  label?: string;
  matchPattern?: string | null;
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

export type UpcomingCharge = { label: string; amountCents: number; due: string };

function foldText(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function shiftIsoDate(date: string, days: number): string {
  const parsed = parseISODate(date);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return formatISODate(parsed);
}

/** Fixed charges still due after today in the period, except those already on the statement. */
export function upcomingFixedCharges(
  charges: PlannedCharge[],
  range: DateRange,
  today: string,
  posted: { date: string; amountCents: number; kind: string; categoryId: string | null; merchant: string }[],
): UpcomingCharge[] {
  const result: UpcomingCharge[] = [];
  for (const charge of charges) {
    if (!charge.active || charge.type === "variable" || charge.amountCents <= 0) continue;
    for (const month of monthsTouched(range)) {
      if (charge.type === "fixed_once" && charge.onceMonth !== month) continue;
      const date = parseISODate(month);
      const due = dueDate(date.getUTCFullYear(), date.getUTCMonth() + 1, charge.day);
      if (due < range.start || due > range.end || due <= today) continue;
      if (chargeAlreadyPosted(charge, due, posted)) continue;
      result.push({ label: charge.label?.trim() || "Planned expense", amountCents: charge.amountCents, due });
    }
  }
  return result.sort((left, right) => left.due.localeCompare(right.due));
}

function chargeAlreadyPosted(
  charge: PlannedCharge,
  due: string,
  posted: { date: string; amountCents: number; kind: string; categoryId: string | null; merchant: string }[],
) {
  const label = foldText(charge.label ?? "");
  const pattern = foldText(charge.matchPattern ?? "");
  const tolerance = Math.max(100, Math.round(charge.amountCents * 0.05));
  const earliest = shiftIsoDate(due, -7);
  const latest = shiftIsoDate(due, 7);
  return posted.some((transaction) => {
    if (transaction.kind !== "expense" || transaction.amountCents >= 0) return false;
    if (Math.abs(-transaction.amountCents - charge.amountCents) > tolerance) return false;
    const merchant = foldText(transaction.merchant);
    if (pattern.length >= 4 && merchant.includes(pattern)) return true;
    if (label.length >= 4 && merchant.includes(label)) return true;
    return Boolean(charge.categoryId && transaction.categoryId === charge.categoryId && transaction.date >= earliest && transaction.date <= latest);
  });
}

export function statusLabel(status: BudgetStatus): string {
  if (status === "on_track") return "On track";
  if (status === "at_risk") return "At risk";
  if (status === "over") return "Over budget";
  return "No budget configured";
}
