const cache = new Map<string, { transactions: unknown[] }>();

export function readBudgetCache<T extends { transactions: unknown[] }>(key: string): T | undefined {
  const snapshot = cache.get(key);
  if (!snapshot || snapshot.transactions.length === 0) return undefined;
  return snapshot as T;
}

export function writeBudgetCache<T extends { transactions: unknown[] }>(key: string, snapshot: T) {
  cache.set(key, snapshot);
}

export function invalidateBudgetCache() {
  cache.clear();
}
