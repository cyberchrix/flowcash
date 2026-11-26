let pending: Promise<{ updated: number; model: boolean }> | null = null;

export function categorizeWithModel() {
  if (pending) return pending;
  pending = fetch("/api/transactions/categorize", { method: "POST" })
    .then(async (response) => {
      if (!response.ok) return { updated: 0, model: false };
      return response.json() as Promise<{ updated: number; model: boolean }>;
    })
    .catch(() => ({ updated: 0, model: false }))
    .finally(() => {
      pending = null;
    });
  return pending;
}
