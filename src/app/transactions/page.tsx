"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/contexts/ToastContext";
import { getCategories } from "@/lib/supabase/categories";
import {
  countFingerprints,
  getCategorizationRules,
  deleteKeywordRule,
  getTransactions,
  saveBankImport,
  saveKeywordRule,
  SavedTransactionInput,
  TransactionListItem,
  updateTransactionCategory,
} from "@/lib/supabase/transactions";
import { categorizeTransaction } from "@/lib/transactions/categorize";
import { fingerprint, markDuplicates } from "@/lib/transactions/duplicates";
import { decodeCsvBytes, parseCsv } from "@/lib/transactions/parseCsv";
import { TransactionKind } from "@/lib/transactions/types";

export const dynamic = "force-dynamic";

type CategoryOption = { id: string; name: string; color: string };

type PreviewRow = SavedTransactionInput & {
  id: string;
};

const BUILT_IN_CATEGORIES = [
  "Groceries",
  "Restaurants",
  "Fuel",
  "Tobacco",
  "Convenience Store",
  "Transfers",
];

const KIND_LABEL: Record<TransactionKind, string> = {
  expense: "Expense",
  income: "Income",
  transfer: "Transfer",
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export default function TransactionsPage() {
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const searchParams = useSearchParams();
  const [month, setMonth] = useState(searchParams.get("month") ?? "");
  const [categoryId, setCategoryId] = useState(searchParams.get("category") ?? "");
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [filename, setFilename] = useState("");
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<{ pattern: string; categoryName: string }[]>([]);
  const [keyword, setKeyword] = useState("");
  const [keywordCategory, setKeywordCategory] = useState("Groceries");

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth");
  }, [user, authLoading, router]);

  const load = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const [categoryRows, transactionRows, ruleRows] = await Promise.all([
        getCategories(user.id),
        getTransactions(user.id, {
          month: month || undefined,
          categoryId: categoryId || undefined,
        }),
        getCategorizationRules(user.id),
      ]);
      setCategories(categoryRows.map((category) => ({
        id: category.id,
        name: category.name,
        color: category.color,
      })));
      setTransactions(transactionRows);
      setRules(ruleRows.map((rule) => ({ pattern: rule.pattern, categoryName: rule.categoryName })));
    } catch (error) {
      console.error(error);
      showError(error instanceof Error ? error.message : "Error loading transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, month, categoryId]);

  const categoryNames = useMemo(() => {
    const names = new Set([...BUILT_IN_CATEGORIES, ...categories.map((category) => category.name)]);
    for (const row of preview ?? []) {
      if (row.categoryName) names.add(row.categoryName);
    }
    return [...names];
  }, [categories, preview]);

  const handleFile = async (file: File) => {
    if (!user) return;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const parsed = parseCsv(decodeCsvBytes(bytes));
      const rules = await getCategorizationRules(user.id);
      const categorized = parsed.map((row) => {
        const result = categorizeTransaction(row.fullLabel, row.amountCents, rules);
        return { ...row, ...result, suggestedCategoryName: result.categoryName };
      });
      const counts = await countFingerprints(
        user.id,
        categorized.map((row) => fingerprint(row))
      );
      const marked = markDuplicates(categorized, counts);
      setFilename(file.name);
      setPreview(
        marked.map((row, index) => ({
          ...row,
          id: `${row.fingerprint}-${index}`,
          suggestedCategoryName: row.suggestedCategoryName,
        }))
      );
    } catch (error) {
      console.error(error);
      showError(error instanceof Error ? error.message : "Could not read this CSV");
    }
  };

  const updatePreview = (id: string, categoryName: string) => {
    setPreview((current) =>
      current?.map((row) =>
        row.id === id
          ? {
              ...row,
              categoryName: categoryName || null,
              needsReview: categoryName ? false : row.needsReview,
            }
          : row
      ) ?? null
    );
  };

  const confirmImport = async () => {
    if (!user || !preview) return;
    setSaving(true);
    try {
      const result = await saveBankImport(user.id, filename, preview);
      showSuccess(
        `Imported ${result.importedCount} transaction${result.importedCount === 1 ? "" : "s"}` +
          (result.duplicateCount ? `, skipped ${result.duplicateCount} duplicate${result.duplicateCount === 1 ? "" : "s"}` : "")
      );
      setPreview(null);
      setLoading(true);
      await load();
    } catch (error) {
      console.error(error);
      showError(error instanceof Error ? error.message : "Import failed");
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = async () => {
    if (!user) return;
    try {
      const pattern = await saveKeywordRule(user.id, keyword, keywordCategory);
      setKeyword("");
      showSuccess(`${pattern} will be categorized as ${keywordCategory} on future imports`);
      await load();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not save this keyword");
    }
  };

  const removeKeyword = async (pattern: string) => {
    if (!user) return;
    try {
      await deleteKeywordRule(user.id, pattern);
      await load();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not delete this keyword");
    }
  };

  const changeSavedCategory = async (transactionId: string, nextCategoryId: string) => {
    if (!user) return;
    try {
      await updateTransactionCategory(user.id, transactionId, nextCategoryId || null);
      await load();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not update the category");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 bg-flowBg dark:bg-transparent">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const newRows = preview?.filter((row) => !row.duplicate) ?? [];

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 bg-flowBg dark:bg-transparent">
      <Header />
      <main className="flex-1 space-y-4 pt-20 pb-28">
        <section className="rounded-[28px] border border-gray-200 bg-white px-6 py-5 dark:border-transparent dark:bg-white/2">
          <h1 className="mb-1 text-xs font-semibold uppercase text-gray-900 dark:text-white/50">
            Transactions
          </h1>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Import a bank CSV, review categories, then save. Planned expenses stay unchanged.
          </p>
          <label className="block rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-700 dark:border-white/15 dark:text-gray-300">
            <span className="font-medium">Upload CSV</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="mt-2 block w-full text-xs"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleFile(file);
                event.target.value = "";
              }}
            />
          </label>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              aria-label="Month"
            />
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              aria-label="Category"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="rounded-[28px] border border-gray-200 bg-white px-6 py-5 dark:border-transparent dark:bg-white/2">
          <h2 className="mb-1 text-xs font-semibold uppercase text-gray-900 dark:text-white/50">
            Keywords
          </h2>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            A keyword such as Auchan is applied to every future import whose label contains it.
          </p>
          <div className="flex gap-2">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Auchan"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              aria-label="Keyword"
            />
            <select
              value={keywordCategory}
              onChange={(event) => setKeywordCategory(event.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              aria-label="Keyword category"
            >
              {categoryNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={addKeyword}
            disabled={keyword.trim().length < 3}
            className="mt-3 w-full rounded-lg bg-flow-primary px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            Remember keyword
          </button>
          {rules.length > 0 && (
            <ul className="mt-4 space-y-2">
              {rules.map((rule) => (
                <li key={rule.pattern} className="flex items-center justify-between gap-3 text-sm text-gray-900 dark:text-white">
                  <span className="min-w-0 truncate">{rule.pattern} → {rule.categoryName}</span>
                  <button type="button" onClick={() => removeKeyword(rule.pattern)} className="text-xs text-gray-500">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {preview && (
          <section className="rounded-[28px] border border-gray-200 bg-white px-6 py-5 dark:border-transparent dark:bg-white/2">
            <h2 className="mb-1 text-xs font-semibold uppercase text-gray-900 dark:text-white/50">
              Import preview
            </h2>
            <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
              {newRows.length} to import, {preview.length - newRows.length} duplicate
              {preview.length - newRows.length === 1 ? "" : "s"}. A changed category is remembered for that merchant.
            </p>
            <div className="space-y-3">
              {preview.map((row) => (
                <article
                  key={row.id}
                  className={`rounded-2xl border border-gray-200 p-3 dark:border-white/10 ${
                    row.duplicate ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {row.fullLabel}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {row.transactionDate}
                        {row.bankCategory ? ` · ${row.bankCategory}` : ""}
                        {row.duplicate ? " · Duplicate" : ""}
                        {row.needsReview && !row.duplicate ? " · Review" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatMoney(row.amountCents)}
                      </p>
                      <p className="text-[10px] uppercase text-gray-400">{KIND_LABEL[row.kind]}</p>
                    </div>
                  </div>
                  {!row.duplicate && (
                    <select
                      value={row.categoryName ?? ""}
                      onChange={(event) => updatePreview(row.id, event.target.value)}
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      aria-label={`Category for ${row.fullLabel}`}
                    >
                      <option value="">Uncategorized</option>
                      {categoryNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  )}
                </article>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-700 dark:border-white/15 dark:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmImport}
                disabled={saving || newRows.length === 0}
                className="flex-1 rounded-lg bg-flow-primary px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save import"}
              </button>
            </div>
          </section>
        )}

        <section className="space-y-3">
          {transactions.length === 0 ? (
            <p className="px-2 text-sm text-gray-500 dark:text-gray-400">No transactions for this filter.</p>
          ) : (
            transactions.map((transaction) => (
              <article
                key={transaction.id}
                className="rounded-[24px] border border-gray-200 bg-white px-4 py-3 dark:border-transparent dark:bg-white/2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {transaction.full_label}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {transaction.transaction_date} · {KIND_LABEL[transaction.kind]}
                      {transaction.bank_category ? ` · ${transaction.bank_category}` : ""}
                      {transaction.needs_review ? " · Review" : ""}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatMoney(Number(transaction.amount_cents))}
                  </p>
                </div>
                <select
                  value={transaction.category_id ?? ""}
                  onChange={(event) => changeSavedCategory(transaction.id, event.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  aria-label={`Category for ${transaction.full_label}`}
                >
                  <option value="">Uncategorized</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </article>
            ))
          )}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
