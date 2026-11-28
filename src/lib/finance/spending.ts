export type SpendingKind = "expense" | "income" | "transfer";

export type SpendingTransaction = {
  id: string;
  date: string;
  amountCents: number;
  kind: SpendingKind;
  categoryId: string | null;
  merchant: string;
  currency: string;
};

export function spendingCents(transaction: SpendingTransaction): number {
  if (transaction.kind !== "expense") return 0;
  return -transaction.amountCents;
}

export function incomeCents(transaction: SpendingTransaction): number {
  return transaction.kind === "income" ? transaction.amountCents : 0;
}

export function totalsFor(transactions: SpendingTransaction[], currency: string) {
  const rows = transactions.filter((transaction) => transaction.currency === currency);
  const spent = rows.reduce((sum, transaction) => sum + Math.max(spendingCents(transaction), 0), 0);
  const refunds = rows.reduce((sum, transaction) => sum + Math.max(-spendingCents(transaction), 0), 0);
  const income = rows.reduce((sum, transaction) => sum + incomeCents(transaction), 0);
  const netSpend = spent - refunds;
  const count = rows.filter((transaction) => transaction.kind === "expense" && transaction.amountCents < 0).length;
  return { spent, refunds, netSpend, income, cashFlow: income - netSpend, count };
}

export function spendByCategory(transactions: SpendingTransaction[], currency: string) {
  const totals = new Map<string | null, number>();
  for (const transaction of transactions) {
    if (transaction.currency !== currency) continue;
    const spend = spendingCents(transaction);
    if (spend === 0) continue;
    const key = transaction.categoryId;
    totals.set(key, (totals.get(key) ?? 0) + spend);
  }
  return totals;
}

function nextMonthKey(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const next = monthNumber === 12 ? 1 : monthNumber + 1;
  const nextYear = monthNumber === 12 ? year + 1 : year;
  return `${nextYear}-${String(next).padStart(2, "0")}`;
}

/** Current month minus the average monthly spend since the first expense. Months with no spend count as zero. */
export function categoryAverageDelta(
  history: SpendingTransaction[],
  currency: string,
  currentMonth: string,
  monthOf: (date: string) => string = (date) => date.slice(0, 7),
): Map<string, number> {
  const byMonth = new Map<string, Map<string, number>>();
  let first: string | null = null;
  for (const transaction of history) {
    if (transaction.currency !== currency) continue;
    const spend = spendingCents(transaction);
    if (spend === 0) continue;
    const month = monthOf(transaction.date);
    const key = transaction.categoryId ?? "none";
    const categories = byMonth.get(month) ?? new Map<string, number>();
    categories.set(key, (categories.get(key) ?? 0) + spend);
    byMonth.set(month, categories);
    if (!first || month < first) first = month;
  }
  if (!first || first >= currentMonth) return new Map();

  const totals = new Map<string, number>();
  let count = 0;
  for (let month = first; month < currentMonth; month = nextMonthKey(month)) {
    count += 1;
    const categories = byMonth.get(month);
    if (!categories) continue;
    for (const [key, amount] of categories) totals.set(key, (totals.get(key) ?? 0) + amount);
  }

  const current = byMonth.get(currentMonth) ?? new Map<string, number>();
  const deltas = new Map<string, number>();
  for (const key of new Set([...totals.keys(), ...current.keys()])) {
    const average = Math.round((totals.get(key) ?? 0) / count);
    deltas.set(key, (current.get(key) ?? 0) - average);
  }
  return deltas;
}

export function spendByDay(transactions: SpendingTransaction[], currency: string) {
  const totals = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.currency !== currency) continue;
    const spend = spendingCents(transaction);
    if (spend === 0) continue;
    totals.set(transaction.date, (totals.get(transaction.date) ?? 0) + spend);
  }
  return totals;
}
