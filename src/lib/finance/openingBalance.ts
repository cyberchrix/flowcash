import { salaryFetchStart, fundedMonth, isSalaryIncome } from "./salaryPeriod";
import { SpendingTransaction, totalsFor } from "./spending";

export type MonthFlow = { incomeCents: number; netSpendCents: number };

export function parseOpeningInput(value: string): number | null {
  const trimmed = value.trim().replace(/\s/g, "").replace("€", "").replace(",", ".");
  if (!trimmed) return null;
  if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error("Enter an amount like -200 or -200,50");
  }
  return Math.round(Number(trimmed) * 100);
}

export function previousMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const previousYear = monthNumber === 1 ? year - 1 : year;
  const previous = monthNumber === 1 ? 12 : monthNumber - 1;
  return `${previousYear}-${String(previous).padStart(2, "0")}`;
}

export function openingBalanceCents(
  month: string,
  flows: ReadonlyMap<string, MonthFlow>,
  overrides: ReadonlyMap<string, number>,
): number {
  const saved = overrides.get(month);
  if (saved != null) return saved;
  const previous = previousMonth(month);
  if (!flows.has(previous) && !overrides.has(previous)) return 0;
  const flow = flows.get(previous) ?? { incomeCents: 0, netSpendCents: 0 };
  return (overrides.get(previous) ?? 0) + flow.incomeCents - flow.netSpendCents;
}

export function salaryLeftCents(
  month: string,
  flows: ReadonlyMap<string, MonthFlow>,
  overrides: ReadonlyMap<string, number>,
): number {
  const flow = flows.get(month) ?? { incomeCents: 0, netSpendCents: 0 };
  return openingBalanceCents(month, flows, overrides) + flow.incomeCents - flow.netSpendCents;
}

export function openingHistoryStart(month: string) {
  const previous = previousMonth(month);
  return salaryFetchStart({ start: `${previous}-01`, end: `${previous}-01` }, "month");
}

export function fundedMonthKey(
  transaction: { date: string; kind: string; merchant: string; categoryId: string | null },
  salaryCategoryIds: ReadonlySet<string>,
) {
  const lateSalary = isSalaryIncome(transaction, salaryCategoryIds) && Number(transaction.date.slice(8, 10)) >= 25;
  return lateSalary ? fundedMonth(transaction.date) : transaction.date.slice(0, 7);
}

export function monthFlowsFromTransactions(
  transactions: SpendingTransaction[],
  salaryCategoryIds: ReadonlySet<string>,
  currency: string,
) {
  const grouped = new Map<string, SpendingTransaction[]>();
  for (const transaction of transactions) {
    if (transaction.currency !== currency) continue;
    const key = fundedMonthKey(transaction, salaryCategoryIds);
    const rows = grouped.get(key) ?? [];
    rows.push(transaction);
    grouped.set(key, rows);
  }
  const flows = new Map<string, MonthFlow>();
  for (const [month, rows] of grouped) {
    const totals = totalsFor(rows, currency);
    flows.set(month, { incomeCents: totals.income, netSpendCents: totals.netSpend });
  }
  return flows;
}
