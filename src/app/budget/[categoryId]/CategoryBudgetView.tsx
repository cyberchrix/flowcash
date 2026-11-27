"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { CheckCircleIcon, ChevronLeftIcon } from "@heroicons/react/24/outline";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { CategoryIcon } from "@/components/finance/categoryIcon";
import { formatCents, ProgressBar } from "@/components/finance/PeriodControls";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/contexts/ToastContext";
import { getDayOfMonth } from "@/lib/date";
import { fixedPlannedCents, PlannedCharge, proratedAllowance } from "@/lib/finance/budget";
import { monthRange } from "@/lib/finance/period";
import { spendingCents } from "@/lib/finance/spending";
import { getCategories } from "@/lib/supabase/categories";
import { getCategoryBudgets } from "@/lib/supabase/budgets";
import { getExpenses } from "@/lib/supabase/expenses";
import { getTransactions, TransactionListItem, updateTransactionCategory } from "@/lib/supabase/transactions";
import { usableBankCategory } from "@/lib/transactions/bankCategories";
import { categoryDisplayName } from "@/lib/transactions/categoryNames";
import { displayMerchant } from "@/lib/transactions/suggestCategory";

const MATCH_LABEL: Record<string, string> = {
  category: "Category-based matching",
  merchant: "Merchant matching",
  manual: "Manual matching",
  none: "No automatic matching",
};

function formatDay(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day))
  );
}

export function CategoryBudgetView() {
  const params = useParams<{ categoryId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const [category, setCategory] = useState<{ id: string; name: string; nameEn: string | null; color: string } | null>(null);
  const [plannedCents, setPlannedCents] = useState(0);
  const [matchMode, setMatchMode] = useState("category");
  const [matchDetail, setMatchDetail] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string; nameEn: string | null; color: string; parentId: string | null }[]>([]);
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [editing, setEditing] = useState<TransactionListItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    const categoryId = params.categoryId;
    const range = monthRange(Number(month.slice(0, 4)), Number(month.slice(5, 7)));
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getCategories(user.id),
      getCategoryBudgets(user.id, "EUR"),
      getExpenses(user.id),
      getTransactions(user.id, { month }),
    ]).then(([categories, budgets, expenses, rows]) => {
      if (cancelled) return;
      setCategories(categories.map((item) => ({ id: item.id, name: item.name, nameEn: item.name_en ?? null, color: item.color, parentId: item.parent_id ?? null })));
      const current = categories.find((item) => item.id === categoryId) ?? null;
      setCategory(current ? { id: current.id, name: current.name, nameEn: current.name_en ?? null, color: current.color } : null);
      const family = new Set([categoryId, ...categories.filter((item) => item.parent_id === categoryId).map((item) => item.id)]);
      const allowance = proratedAllowance(
        budgets
          .filter((budget) => budget.category_id === categoryId)
          .map((budget) => ({
            month: budget.effective_month,
            amountCents: Number(budget.amount_cents),
            active: budget.active,
            forecast: budget.forecast,
          })),
        range
      );
      const charges: PlannedCharge[] = expenses
        .filter((expense) => expense.category_id && family.has(expense.category_id) && (expense.currency || "EUR") === "EUR")
        .map((expense) => ({
          categoryId: expense.category_id,
          amountCents: Math.round(Number(expense.amount) * 100),
          type: expense.expense_type ?? "fixed_recurring",
          active: expense.active !== false,
          day: getDayOfMonth(expense.expense_date),
          onceMonth: expense.expense_type === "fixed_once" ? `${expense.expense_date.slice(0, 7)}-01` : null,
        }));
      const fixed = fixedPlannedCents(charges, range).cents;
      setPlannedCents(allowance.cents + fixed);
      const modes = expenses
        .filter((expense) => expense.category_id === categoryId && expense.active !== false)
        .map((expense) => expense.match_mode ?? "none");
      const mode = allowance.cents > 0 ? "category" : modes.find((item) => item !== "none") ?? "category";
      setMatchMode(mode);
      const patterns = expenses
        .filter((expense) => expense.category_id === categoryId && expense.match_mode === "merchant" && expense.match_pattern)
        .map((expense) => expense.match_pattern);
      setMatchDetail(
        mode === "merchant" && patterns.length > 0
          ? `Transactions whose label contains ${patterns.join(", ")}`
          : `All transactions categorized as ${current ? categoryDisplayName(current) : "this category"}`
      );
      setTransactions(
        rows
          .filter((row) => row.category_id && family.has(row.category_id) && row.kind === "expense")
          .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
      );
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user, params.categoryId, month]);

  const changeCategory = async (nextCategoryId: string) => {
    if (!user || !editing || saving) return;
    setSaving(true);
    try {
      await updateTransactionCategory(user.id, editing.id, nextCategoryId);
      const nextCategory = categories.find((item) => item.id === nextCategoryId);
      const nextName = nextCategory ? categoryDisplayName(nextCategory) : "the new category";
      const rows = await getTransactions(user.id, { month });
      setTransactions(
        rows
          .filter((row) => {
            const familyIds = new Set([category?.id, ...categories.filter((item) => item.parentId === category?.id).map((item) => item.id)]);
            return row.category_id && familyIds.has(row.category_id) && row.kind === "expense";
          })
          .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
      );
      showSuccess(`Moved to ${nextName}`);
      setEditing(null);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not update the category");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return <div className="mx-auto flex min-h-screen max-w-md items-center justify-center text-gray-500">Loading...</div>;
  }
  if (!user) return null;

  const actualCents = transactions.reduce(
    (sum, row) => sum + spendingCents({
      id: row.id,
      date: row.transaction_date,
      amountCents: Number(row.amount_cents),
      kind: row.kind,
      categoryId: row.category_id,
      merchant: row.normalized_merchant,
      currency: row.currency || "EUR",
    }),
    0
  );
  const over = plannedCents > 0 && actualCents > plannedCents;
  const percent = plannedCents > 0 ? Math.round((actualCents / plannedCents) * 1000) / 10 : null;

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col overflow-hidden bg-flowBg px-4 dark:bg-transparent">
      <Header />
      <main className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4 pt-20">
        <Link href="/budget" className="inline-flex items-center gap-1 text-sm font-medium text-flow-primary">
          <ChevronLeftIcon className="h-4 w-4" />
          Budget
        </Link>
        {!category ? (
          <p className="text-sm text-gray-500">This category is not available.</p>
        ) : (
          <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 dark:border-transparent dark:bg-white/5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: `${category.color}22`, color: category.color }}>
                <CategoryIcon name={category.name} className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-base font-semibold text-gray-900 dark:text-white">{categoryDisplayName(category)}</h1>
                <p className="text-xs text-gray-500">{matchMode === "merchant" ? "Monthly fixed expense" : "Monthly variable expense"}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Planned</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900 dark:text-white">{formatCents(plannedCents)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Actual</p>
                <p className={`mt-1 text-lg font-semibold tabular-nums ${over ? "text-[#FB7185]" : "text-gray-900 dark:text-white"}`}>{formatCents(actualCents)}</p>
              </div>
            </div>
            <div className="mt-3">
              <ProgressBar value={percent ?? 0} color={over ? "#FB7185" : category.color} />
            </div>
            <p className={`mt-2 text-sm ${over ? "text-[#FB7185]" : "text-[#34D399]"}`}>
              {plannedCents === 0
                ? "No budget configured"
                : over
                  ? `Over budget by ${formatCents(actualCents - plannedCents)}`
                  : `${formatCents(plannedCents - actualCents)} remaining`}
            </p>

            <div className="mt-5 border-t border-gray-200 pt-4 dark:border-white/10">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Matching method</h2>
              <div className="mt-3 rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/5">
                <p className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                  <CheckCircleIcon className="h-4 w-4 text-[#34D399]" />
                  {MATCH_LABEL[matchMode] ?? MATCH_LABEL.category}
                </p>
                <p className="mt-1 pl-6 text-xs text-gray-500">{matchDetail}</p>
              </div>
            </div>

            <div className="mt-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Linked transactions</h2>
              {transactions.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">No transactions in this category for this month.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {[...transactions].sort((left, right) => {
                    const leftName = categoryDisplayName(categories.find((item) => item.id === left.category_id) ?? { name: "" });
                    const rightName = categoryDisplayName(categories.find((item) => item.id === right.category_id) ?? { name: "" });
                    return leftName.localeCompare(rightName, "en") || right.transaction_date.localeCompare(left.transaction_date);
                  }).map((row, index, ordered) => {
                    const subcategory = categoryDisplayName(categories.find((item) => item.id === row.category_id) ?? { name: "" });
                    const previous = index === 0 ? "" : categoryDisplayName(categories.find((item) => item.id === ordered[index - 1]?.category_id) ?? { name: "" });
                    const spent = spendingCents({
                      id: row.id,
                      date: row.transaction_date,
                      amountCents: Number(row.amount_cents),
                      kind: row.kind,
                      categoryId: row.category_id,
                      merchant: row.normalized_merchant,
                      currency: row.currency || "EUR",
                    });
                    return (
                      <li key={row.id}>
                        {subcategory !== previous && <h3 className="px-1 pt-2 text-xs font-semibold uppercase text-gray-500">{subcategory}</h3>}
                        <button
                          type="button"
                          onClick={() => {
                            if (!usableBankCategory(row.bank_category)) setEditing(row);
                          }}
                          className="flex w-full items-center gap-3 rounded-2xl bg-gray-50 px-3 py-3 text-left dark:bg-white/5"
                        >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${category.color}22`, color: category.color }}>
                          <CategoryIcon name={category.name} className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{displayMerchant(row.full_label || row.normalized_merchant)}</p>
                          <p className="text-xs text-gray-500">{formatDay(row.transaction_date)}</p>
                        </div>
                        <p className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{formatCents(spent)}</p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        )}
      </main>
      <BottomNav />
      {editing && category && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 px-4 pb-6" onClick={() => !saving && setEditing(null)}>
          <div
            role="dialog"
            aria-label="Change category"
            className="max-h-[70vh] w-full max-w-md overflow-auto rounded-3xl bg-white p-5 dark:bg-[#24252C]"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Change category</h2>
            <p className="mt-1 truncate text-sm text-gray-500">{displayMerchant(editing.full_label || editing.normalized_merchant)}</p>
            <div className="mt-4 space-y-1">
              {categories.map((item) => {
                const selected = item.id === category.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={saving || selected}
                    onClick={() => changeCategory(item.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm ${
                      selected ? "bg-flow-primary/10 text-flow-primary" : "text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-white/5"
                    } disabled:opacity-60`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: `${item.color}22`, color: item.color }}>
                      <CategoryIcon name={item.name} className="h-4 w-4" />
                    </span>
                    <span className="flex-1">{categoryDisplayName(item)}</span>
                    {selected && <CheckCircleIcon className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
