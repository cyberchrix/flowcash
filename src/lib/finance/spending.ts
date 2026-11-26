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
