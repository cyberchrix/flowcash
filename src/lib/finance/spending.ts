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

export type AverageMonth = { month: string; cents: number; outlier: boolean };

/** Months that build the average for one category. The average itself is unchanged. */
export function categoryAverageMonths(
  history: SpendingTransaction[],
  currency: string,
  currentMonth: string,
  categoryId: string,
  monthOf: (date: string) => string = (date) => date.slice(0, 7),
): { months: AverageMonth[]; average: number } {
  const byMonth = new Map<string, number>();
  let first: string | null = null;
  for (const transaction of history) {
    if (transaction.currency !== currency) continue;
    const spend = spendingCents(transaction);
    if (spend === 0) continue;
    const month = monthOf(transaction.date);
    if (!first || month < first) first = month;
    if ((transaction.categoryId ?? "none") !== categoryId) continue;
    byMonth.set(month, (byMonth.get(month) ?? 0) + spend);
  }
  if (!first || first >= currentMonth) return { months: [], average: 0 };

  const months: AverageMonth[] = [];
  let total = 0;
  let count = 0;
  for (let month = first; month < currentMonth; month = nextMonthKey(month)) {
    const cents = byMonth.get(month) ?? 0;
    months.push({ month, cents, outlier: false });
    total += cents;
    count += 1;
  }
  const positive = months.map((month) => month.cents).filter((cents) => cents > 0).sort((left, right) => left - right);
  const median = positive.length >= 2 ? positive[Math.floor(positive.length / 2)] : 0;
  for (const month of months) {
    month.outlier = median > 0 && month.cents >= median * 2 && month.cents - median >= 5000;
  }
  return { months, average: Math.round(total / count) };
}

export type SubscriptionCandidate = {
  merchant: string;
  amountCents: number;
  day: number;
  categoryId: string | null;
  months: number;
};

function foldMerchant(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Merchants charged a steady amount in at least three months, and not already planned. */
export function subscriptionCandidates(
  history: SpendingTransaction[],
  currency: string,
  planned: { label: string; amountCents: number }[],
  monthOf: (date: string) => string = (date) => date.slice(0, 7),
  nameOf: (transaction: SpendingTransaction) => string = (transaction) => transaction.merchant,
): SubscriptionCandidate[] {
  const groups = new Map<string, { name: string; rows: { month: string; amount: number; day: number; categoryId: string | null }[] }>();
  for (const transaction of history) {
    if (transaction.currency !== currency || transaction.kind !== "expense" || transaction.amountCents >= 0) continue;
    const name = nameOf(transaction).trim();
    if (name.length < 3 || name === "Card payment" || name === "Vir. émis") continue;
    const key = foldMerchant(name);
    const group = groups.get(key) ?? { name, rows: [] };
    group.rows.push({
      month: monthOf(transaction.date),
      amount: -transaction.amountCents,
      day: Number(transaction.date.slice(8, 10)),
      categoryId: transaction.categoryId,
    });
    groups.set(key, group);
  }

  const found: SubscriptionCandidate[] = [];
  for (const group of groups.values()) {
    const amounts = group.rows.map((row) => row.amount).sort((left, right) => left - right);
    const median = amounts[Math.floor(amounts.length / 2)];
    const tolerance = Math.max(100, Math.round(median * 0.05));
    const stable = group.rows.filter((row) => Math.abs(row.amount - median) <= tolerance);
    const months = new Set(stable.map((row) => row.month));
    if (months.size < 3 || stable.length / group.rows.length < 0.6) continue;
    const covered = planned.some((item) => {
      const label = foldMerchant(item.label);
      const merchant = foldMerchant(group.name);
      const sameName = label.length > 0 && (label.includes(merchant) || merchant.includes(label));
      return sameName && Math.abs(item.amountCents - median) <= tolerance;
    });
    if (covered) continue;
    const days = stable.map((row) => row.day).sort((left, right) => left - right);
    const categories = new Map<string, number>();
    for (const row of stable) {
      if (!row.categoryId) continue;
      categories.set(row.categoryId, (categories.get(row.categoryId) ?? 0) + 1);
    }
    const categoryId = [...categories.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
    found.push({ merchant: group.name, amountCents: median, day: days[Math.floor(days.length / 2)], categoryId, months: months.size });
  }
  return found.sort((left, right) => right.amountCents - left.amountCents);
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
