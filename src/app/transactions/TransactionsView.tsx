"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlassIcon, TagIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/contexts/ToastContext";
import { getCategories } from "@/lib/supabase/categories";
import {
  countFingerprints,
  getCategorizationRules,
  deleteKeywordRule,
  ensureTransactionSync,
  countUncategorizedTransactions,
  getTransactions,
  clearAllTransactions,
  saveBankImport,
  saveKeywordRule,
  SavedTransactionInput,
  TransactionListItem,
  updateTransactionCategory,
} from "@/lib/supabase/transactions";
import { categorizeTransaction } from "@/lib/transactions/categorize";
import { categorizeWithModel } from "@/lib/transactions/categorizeWithModel";
import { categoryDisplayName } from "@/lib/transactions/categoryNames";
import { CategoryPicker, PickerCategory } from "@/components/transactions/CategoryPicker";
import { displayMerchant } from "@/lib/transactions/suggestCategory";
import { fingerprint, markDuplicates, markSameOperations } from "@/lib/transactions/duplicates";
import { decodeCsvBytes, parseCsv } from "@/lib/transactions/parseCsv";
import { parseXlsx } from "@/lib/transactions/parseXlsx";
import { TransactionKind } from "@/lib/transactions/types";

type CategoryOption = PickerCategory;

type PreviewRow = SavedTransactionInput & {
  id: string;
};

const BUILT_IN_CATEGORIES = [
  "Salary",
  "Groceries",
  "Restaurants",
  "Fuel",
  "Tobacco",
  "Convenience Store",
  "Transfers",
  "Car insurance",
  "Cash withdrawals",
  "Bank fees",
  "Veterinary",
  "Child support",
  "Travel",
  "Leisure",
  "Gifts",
];

const UNCATEGORIZED = "uncategorized";

const KIND_LABEL: Record<TransactionKind, string> = {
  expense: "Expense",
  income: "Income",
  transfer: "Transfer",
};

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, monthNumber - 1, 1))
  );
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function fold(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function TransactionsView() {
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const searchParams = useSearchParams();
  const [month, setMonth] = useState(searchParams.get("month") ?? "");
  const [categoryId, setCategoryId] = useState(searchParams.get("category") ?? "");
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [filename, setFilename] = useState("");
  const [skippedRows, setSkippedRows] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reading, setReading] = useState(false);
  const [rules, setRules] = useState<{ pattern: string; categoryName: string; amountCents: number | null }[]>([]);
  const [keyword, setKeyword] = useState("");
  const [keywordCategory, setKeywordCategory] = useState("Groceries");
  const [keywordsOpen, setKeywordsOpen] = useState(false);
  const [keywordFormOpen, setKeywordFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [editing, setEditing] = useState<TransactionListItem | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth");
  }, [user, authLoading, router]);

  const load = async (options?: { silent?: boolean }) => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const transactionFilters = {
        month: month || undefined,
        categoryId: categoryId && categoryId !== UNCATEGORIZED ? categoryId : undefined,
        uncategorized: categoryId === UNCATEGORIZED,
      };
      const [categoryRows, transactionRows, ruleRows, missingCategory] = await Promise.all([
        getCategories(user.id),
        getTransactions(user.id, transactionFilters),
        getCategorizationRules(user.id),
        countUncategorizedTransactions(user.id),
      ]);
      setCategories(categoryRows.map((category) => ({
        id: category.id,
        name: category.name,
        nameEn: category.name_en ?? null,
        nameFr: category.name_fr ?? null,
        color: category.color,
        parentId: category.parent_id ?? null,
      })));
      setTransactions(transactionRows);
      setUncategorizedCount(missingCategory);
      setRules(ruleRows.map((rule) => ({
        pattern: rule.pattern,
        categoryName: rule.categoryName,
        amountCents: rule.amountCents,
      })));
      setLoading(false);
      const [model, synced] = await Promise.all([
        categorizeWithModel(),
        ensureTransactionSync(user.id),
      ]);
      if (!options?.silent && model.updated > 0) {
        showSuccess(`${model.updated} transaction${model.updated === 1 ? "" : "s"} categorized`);
      }
      if (model.updated + synced > 0) {
        const [freshRows, freshMissing] = await Promise.all([
          getTransactions(user.id, transactionFilters),
          countUncategorizedTransactions(user.id),
        ]);
        setTransactions(freshRows);
        setUncategorizedCount(freshMissing);
      }
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

  const visibleTransactions = useMemo(() => {
    const needle = fold(query.trim());
    if (!needle) return transactions;
    return transactions.filter((transaction) => {
      const amount = (Math.abs(Number(transaction.amount_cents)) / 100).toFixed(2);
      const haystack = fold([
        transaction.full_label,
        transaction.operation_label ?? "",
        transaction.normalized_merchant,
        transaction.bank_category ?? "",
        transaction.categories?.name ?? "",
        amount,
        amount.replace(".", ","),
      ].join(" "));
      return haystack.includes(needle);
    });
  }, [query, transactions]);

  const categoryNames = useMemo(() => {
    const names = new Set([...BUILT_IN_CATEGORIES, ...categories.map((category) => category.name)]);
    for (const row of preview ?? []) {
      if (row.categoryName) names.add(row.categoryName);
    }
    return [...names];
  }, [categories, preview]);

  const handleFile = async (file: File) => {
    if (!user) return;
    setReading(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const isWorkbook = file.name.toLowerCase().endsWith(".xlsx") || (bytes[0] === 0x50 && bytes[1] === 0x4b);
      const parsed = isWorkbook ? parseXlsx(bytes) : parseCsv(decodeCsvBytes(bytes));
      setSkippedRows(parsed.skipped);
      const rules = await getCategorizationRules(user.id);
      const categorized = parsed.rows.map((row) => {
        const result = categorizeTransaction(
          row.fullLabel,
          row.amountCents,
          rules,
          [row.bankCategory, row.bankSubcategory].filter(Boolean).join(" ")
        );
        return {
          ...row,
          ...result,
          suggestedCategoryName: result.categoryName,
        };
      });
      const counts = await countFingerprints(
        user.id,
        categorized.map((row) => fingerprint(row))
      );
      const existing = await getTransactions(user.id, {});
      const operationCounts = new Map<string, number>();
      for (const saved of existing) {
        const key = `${saved.transaction_date}|${Number(saved.amount_cents)}`;
        operationCounts.set(key, (operationCounts.get(key) ?? 0) + 1);
      }
      const marked = markSameOperations(markDuplicates(categorized, counts), operationCounts);
      setFilename(file.name);
      setPreviewOpen(false);
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
    } finally {
      setReading(false);
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
      const importedMonths = [...new Set(newRows.map((row) => row.transactionDate.slice(0, 7)))].sort();
      setPreview(null);
      const hadMonth = Boolean(month || searchParams.get("month"));
      setMonth("");
      if (searchParams.get("month")) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("month");
        router.replace(params.size ? `/transactions?${params}` : "/transactions");
      }
      if (!hadMonth) await load({ silent: true });
      const span = importedMonths.length
        ? `, ${formatMonth(importedMonths[0])} to ${formatMonth(importedMonths[importedMonths.length - 1])}`
        : "";
      showSuccess(
        `Imported ${result.importedCount} transaction${result.importedCount === 1 ? "" : "s"}` +
          span +
          (result.duplicateCount ? `, skipped ${result.duplicateCount} duplicate${result.duplicateCount === 1 ? "" : "s"}` : ""),
        5000
      );
    } catch (error) {
      console.error(error);
      showError(error instanceof Error ? error.message : "Import failed");
    } finally {
      setSaving(false);
    }
  };

  const clearTransactions = async () => {
    if (!user || clearing) return;
    setClearing(true);
    try {
      const removed = await clearAllTransactions(user.id);
      setTransactions([]);
      setPreview(null);
      setConfirmClear(false);
      showSuccess(
        removed === 0
          ? "No transactions to clear"
          : `Cleared ${removed} transaction${removed === 1 ? "" : "s"}`
      );
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not clear transactions");
    } finally {
      setClearing(false);
    }
  };

  const addKeyword = async () => {
    if (!user) return;
    try {
      const pattern = await saveKeywordRule(user.id, keyword, keywordCategory);
      setKeyword("");
      showSuccess(`${pattern} is now categorized as ${keywordCategory}`);
      await load();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not save this keyword");
    }
  };

  const removeKeyword = async (pattern: string, amountCents: number | null) => {
    if (!user) return;
    try {
      await deleteKeywordRule(user.id, pattern, amountCents);
      await load();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not delete this keyword");
    }
  };

  const changeKeywordCategory = async (pattern: string, categoryName: string, amountCents: number | null) => {
    if (!user || !categoryName) return;
    const current = rules.find((rule) => rule.pattern === pattern && rule.amountCents === amountCents)?.categoryName;
    if (current === categoryName) return;
    try {
      await saveKeywordRule(user.id, pattern, categoryName, amountCents);
      showSuccess(`${pattern} is now categorized as ${categoryName}`);
      await load();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not update this keyword");
    }
  };

  const saveCategory = async (nextCategoryId: string, keyword: string | null) => {
    if (!user || !editing) return;
    setSavingCategory(true);
    try {
      const result = await updateTransactionCategory(user.id, editing.id, nextCategoryId, keyword);
      const categoryName = categoryDisplayName(categories.find((category) => category.id === nextCategoryId) ?? { name: "" });
      const count = result?.updated ?? 1;
      showSuccess(result?.pattern
        ? `${result.pattern} will be categorized as ${categoryName} · ${count} transaction${count === 1 ? "" : "s"}`
        : `Categorized ${count} transaction${count === 1 ? "" : "s"} as ${categoryName}`);
      setEditing(null);
      await load();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not update the category");
    } finally {
      setSavingCategory(false);
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
    <div className="mx-auto flex h-dvh max-w-md flex-col overflow-hidden px-5 bg-flowBg dark:bg-transparent">
      <Header />
      <main className="min-h-0 flex-1 space-y-4 overflow-y-auto pt-20 pb-4">
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="flex h-10 flex-1 cursor-pointer items-center justify-center rounded-lg bg-flow-primary text-sm font-medium text-white">
              Import
              <input
                type="file"
                accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                disabled={reading || saving}
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleFile(file);
                  event.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              disabled={clearing || transactions.length === 0}
              className="flex h-10 items-center gap-1.5 rounded-lg bg-red-50 px-3 text-sm font-medium text-red-600 disabled:opacity-40 dark:bg-red-950/40 dark:text-red-300"
            >
              <TrashIcon className="h-4 w-4" />
              Clear
            </button>
            <button
              type="button"
              aria-label="Add keyword"
              aria-pressed={keywordFormOpen}
              onClick={() => setKeywordFormOpen((open) => !open)}
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                keywordFormOpen
                  ? "bg-flow-primary text-white"
                  : "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
              }`}
            >
              <TagIcon className="h-5 w-5" />
            </button>
          </div>
          {confirmClear && (
            <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
              <p className="text-sm text-red-700 dark:text-red-200">
                This deletes every imported transaction. Budgets and keywords stay.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  disabled={clearing}
                  className="h-10 flex-1 rounded-lg bg-white text-sm font-medium text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={clearTransactions}
                  disabled={clearing}
                  className="h-10 flex-1 rounded-lg bg-red-600 text-sm font-medium text-white disabled:opacity-60"
                >
                  {clearing ? "Clearing…" : "Delete all"}
                </button>
              </div>
            </div>
          )}
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search transactions"
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          {(uncategorizedCount > 0 || categoryId === UNCATEGORIZED) && (
            <button
              type="button"
              aria-pressed={categoryId === UNCATEGORIZED}
              onClick={() => {
                if (categoryId === UNCATEGORIZED) {
                  setCategoryId("");
                  return;
                }
                setMonth("");
                setCategoryId(UNCATEGORIZED);
              }}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm font-medium ${
                categoryId === UNCATEGORIZED
                  ? "border-flow-primary bg-flow-primary/10 text-gray-900 dark:text-gray-100"
                  : "border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              }`}
            >
              Uncategorized · {uncategorizedCount}
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="min-w-0 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              aria-label="Month"
            />
            <select
              value={categoryId}
              onChange={(event) => {
                const value = event.target.value;
                if (value === UNCATEGORIZED) setMonth("");
                setCategoryId(value);
              }}
              className="min-w-0 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              aria-label="Category"
            >
              <option value="">All categories</option>
              <option value={UNCATEGORIZED}>Uncategorized</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {categoryDisplayName(category)}
                </option>
              ))}
            </select>
          </div>
        </section>

        {keywordFormOpen && (
        <section className="rounded-[28px] border border-gray-200 bg-white px-4 py-4 dark:border-transparent dark:bg-white/2">
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
              {categories.map((category) => (
                <option key={category.id} value={category.name}>{categoryDisplayName(category)}</option>
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
            <div className="mt-4">
              <ul className="space-y-2">
                {(keywordsOpen ? rules : rules.slice(0, 2)).map((rule) => (
                  <li key={`${rule.pattern}:${rule.amountCents ?? ""}`} className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                    <span className="min-w-0 flex-1 truncate">
                      {rule.pattern}
                      {rule.amountCents != null ? ` · ${formatMoney(rule.amountCents)}` : ""}
                    </span>
                    <select
                      value={rule.categoryName}
                      aria-label={`Category for ${rule.pattern}`}
                      onChange={(event) => changeKeywordCategory(rule.pattern, event.target.value, rule.amountCents)}
                      className="max-w-[9rem] rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    >
                      {categoryNames.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeKeyword(rule.pattern, rule.amountCents)}
                      aria-label={`Remove ${rule.pattern}`}
                      className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
              {rules.length > 2 && (
                <button
                  type="button"
                  onClick={() => setKeywordsOpen((open) => !open)}
                  className="mt-2 text-sm font-medium text-flow-primary"
                >
                  {keywordsOpen ? "Show less" : `Show all ${rules.length}`}
                </button>
              )}
            </div>
          )}
        </section>
        )}

        {preview && (
          <section className="rounded-[28px] border border-gray-200 bg-white px-6 py-5 dark:border-transparent dark:bg-white/2">
            <h2 className="mb-1 text-xs font-semibold uppercase text-gray-900 dark:text-white/50">
              Import preview
            </h2>
            <p className="text-sm text-gray-900 dark:text-white">
              {newRows.length} to add
              {newRows.length > 0 ? `, ${formatMonth(newRows[newRows.length - 1].transactionDate.slice(0, 7))} to ${formatMonth(newRows[0].transactionDate.slice(0, 7))}` : ""}
              . {preview.length - newRows.length} already saved
              {skippedRows.length ? `, ${skippedRows.length} unreadable` : ""}.
            </p>
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
                {saving ? "Saving..." : `Save ${newRows.length}`}
              </button>
            </div>
            {newRows.length > 0 && (
              <button
                type="button"
                onClick={() => setPreviewOpen((open) => !open)}
                className="mt-3 text-sm font-medium text-flow-primary"
              >
                {previewOpen ? "Hide operations" : "Review operations"}
              </button>
            )}
            {previewOpen && <div className="mt-4 space-y-3">
              {newRows.map((row) => (
                <article
                  key={row.id}
                  className={`rounded-2xl border border-gray-200 p-3 dark:border-white/10 ${
                    row.duplicate ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 break-words text-sm font-medium leading-snug text-gray-900 dark:text-white">
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
                </article>
              ))}
            </div>}
          </section>
        )}

        <section className="space-y-3">
          {visibleTransactions.length === 0 ? (
            <p className="px-2 text-sm text-gray-500 dark:text-gray-400">
              {query.trim()
                ? "No transactions match this search."
                : categoryId === UNCATEGORIZED
                  ? "Every transaction has a category."
                  : "No transactions for this filter."}
            </p>
          ) : (
            visibleTransactions.map((transaction, index) => {
              const monthKey = transaction.transaction_date.slice(0, 7);
              const previousMonth = visibleTransactions[index - 1]?.transaction_date.slice(0, 7);
              return (
              <div key={transaction.id} className="space-y-3">
              {monthKey !== previousMonth && (
                <h2 className="px-1 pt-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  {formatMonth(monthKey)}
                </h2>
              )}
              <article className="rounded-[24px] border border-gray-200 bg-white dark:border-transparent dark:bg-white/2">
                <button
                  type="button"
                  onClick={() => setEditing(transaction)}
                  className="w-full px-4 py-3 text-left"
                >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-snug text-gray-900 dark:text-white">
                      {displayMerchant(transaction.full_label)}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {transaction.transaction_date} · {KIND_LABEL[transaction.kind]}
                      {transaction.category_id ? ` · ${categoryDisplayName(categories.find((category) => category.id === transaction.category_id) ?? { name: transaction.categories?.name ?? "" })}` : ""}
                      {transaction.needs_review ? " · Review" : ""}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatMoney(Number(transaction.amount_cents))}
                  </p>
                </div>
                </button>
              </article>
              </div>
              );
            })
          )}
        </section>
      </main>
      <BottomNav />
      {editing && (
        <CategoryPicker
          categories={categories}
          title={displayMerchant(editing.full_label)}
          label={editing.full_label}
          currentCategoryId={editing.category_id}
          saving={savingCategory}
          onClose={() => setEditing(null)}
          onSave={saveCategory}
        />
      )}
      {(reading || saving) && (
        <div className="fixed inset-x-4 bottom-24 z-[70] rounded-2xl bg-flow-primary px-4 py-3 text-center text-sm font-semibold text-white shadow-lg">
          {reading ? "Reading the file…" : "Importing…"}
        </div>
      )}
    </div>
  );
}
