const TTL_MS = 10 * 60 * 1000;
let pending: Promise<{ updated: number; model: boolean }> | null = null;
let cached: { at: number; result: { updated: number; model: boolean } } | null = null;

export function invalidateCategoryModel() {
  cached = null;
}

export function categorizeWithModel() {
  if (cached && Date.now() - cached.at < TTL_MS) return Promise.resolve(cached.result);
  if (pending) return pending;
  pending = fetch("/api/transactions/categorize", { method: "POST" })
    .then(async (response) => {
      const result = response.ok
        ? await response.json() as { updated: number; model: boolean }
        : { updated: 0, model: false };
      cached = { at: Date.now(), result };
      return result;
    })
    .catch(() => ({ updated: 0, model: false }))
    .finally(() => {
      pending = null;
    });
  return pending;
}
