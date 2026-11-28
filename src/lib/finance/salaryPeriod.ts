import { DateRange, PeriodUnit } from "./period";

const SALARY_FROM_DAY = 25;

export function isSalaryIncome(
  transaction: { kind: string; merchant: string; categoryId: string | null },
  salaryCategoryIds: ReadonlySet<string>
): boolean {
  if (transaction.kind !== "income") return false;
  if (transaction.categoryId && salaryCategoryIds.has(transaction.categoryId)) return true;
  return transaction.merchant.toUpperCase().includes("KINGFISHER");
}

export function fundedMonth(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  if (day < SALARY_FROM_DAY) return date.slice(0, 7);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

export function monthPeriodBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return {
    start: salaryFetchStart({ start: `${month}-01`, end: `${month}-01` }, "month"),
    end: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function salaryFetchStart(range: DateRange, unit: PeriodUnit): string {
  if (unit !== "month" && unit !== "year") return range.start;
  const [year, month] = range.start.split("-").map(Number);
  const previousYear = month === 1 ? year - 1 : year;
  const previousMonth = month === 1 ? 12 : month - 1;
  const from = `${previousYear}-${String(previousMonth).padStart(2, "0")}-25`;
  return from < range.start ? from : range.start;
}

export function paydayByFundedMonth(
  transactions: { date: string; kind: string; merchant: string; categoryId: string | null }[],
  salaryCategoryIds: ReadonlySet<string>,
): Map<string, string> {
  const paydays = new Map<string, string>();
  for (const transaction of transactions) {
    if (!isSalaryIncome(transaction, salaryCategoryIds)) continue;
    if (Number(transaction.date.slice(8, 10)) < SALARY_FROM_DAY) continue;
    const month = fundedMonth(transaction.date);
    const current = paydays.get(month);
    if (!current || transaction.date < current) paydays.set(month, transaction.date);
  }
  return paydays;
}

// The funded month runs from its payday through the day before the next one.
// Spending before that payday stays with the previous salary, even when the account is already overdrawn.
export function salaryPeriodMonth(date: string, paydays: ReadonlyMap<string, string>): string {
  const ordered = [...paydays.entries()].sort((left, right) => left[1].localeCompare(right[1]));
  let month = date.slice(0, 7);
  for (const [funded, payday] of ordered) {
    if (payday <= date) month = funded;
    else break;
  }
  return month;
}

export function transactionInPeriod(
  transaction: { date: string; kind: string; merchant: string; categoryId: string | null },
  range: DateRange,
  unit: PeriodUnit,
  salaryCategoryIds: ReadonlySet<string>
): boolean {
  const lateSalary = isSalaryIncome(transaction, salaryCategoryIds) && Number(transaction.date.slice(8, 10)) >= SALARY_FROM_DAY;
  if (lateSalary) {
    if (unit !== "month" && unit !== "year") return false;
    const month = fundedMonth(transaction.date);
    return month >= range.start.slice(0, 7) && month <= range.end.slice(0, 7);
  }
  return transaction.date >= range.start && transaction.date <= range.end;
}
