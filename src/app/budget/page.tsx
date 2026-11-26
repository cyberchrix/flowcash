"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { formatCents, PeriodControls, ProgressBar } from "@/components/finance/PeriodControls";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/contexts/ToastContext";
import { getDayOfMonth } from "@/lib/date";
import { getCategories } from "@/lib/supabase/categories";
import { getExpenses } from "@/lib/supabase/expenses";
import { deleteCategoryBudget, duplicateBudgets, getCategoryBudgets, saveCategoryBudget } from "@/lib/supabase/budgets";
import { getTransactions } from "@/lib/supabase/transactions";
import { budgetStatus, consumedPercent, fixedPlannedCents, PlannedCharge, proratedAllowance, statusLabel } from "@/lib/finance/budget";
import { buildInsights } from "@/lib/finance/insights";
import { spendingPace } from "@/lib/finance/pace";
import { formatISODate, formatPeriodLabel, inclusiveDays, PeriodUnit, rangeFor, shiftAnchor } from "@/lib/finance/period";
import { spendByCategory, SpendingTransaction, totalsFor } from "@/lib/finance/spending";

export const dynamic = "force-dynamic";

type CategoryRow = { id: string; name: string; color: string };

export default function BudgetPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [transactions, setTransactions] = useState<SpendingTransaction[]>([]);
  const [budgets, setBudgets] = useState<Awaited<ReturnType<typeof getCategoryBudgets>>>([]);
  const [charges, setCharges] = useState<PlannedCharge[]>([]);
  const [unit, setUnit] = useState<PeriodUnit>("month");
  const [anchor, setAnchor] = useState(() => formatISODate(new Date()));
  const [loading, setLoading] = useState(true);
  const [managing, setManaging] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const currency = "EUR";

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth");
  }, [user, authLoading, router]);

  const range = rangeFor(unit, anchor, 1);
  const month = `${range.start.slice(0, 7)}-01`;

  const load = async () => {
    if (!user) return;
    try {
      const [categoryRows, budgetRows, transactionRows, expenseRows] = await Promise.all([
        getCategories(user.id),
        getCategoryBudgets(user.id, currency),
        getTransactions(user.id, { start: range.start, end: range.end }),
        getExpenses(user.id),
      ]);
      setCategories(categoryRows.map((category) => ({ id: category.id, name: category.name, color: category.color })));
      setBudgets(budgetRows);
      setCharges(expenseRows
        .filter((expense) => (expense.currency || "EUR") === currency)
        .map((expense) => ({
          categoryId: expense.category_id,
          amountCents: Math.round(Number(expense.amount) * 100),
          type: expense.expense_type ?? "fixed_recurring",
          active: expense.active !== false,
          day: getDayOfMonth(expense.expense_date),
          onceMonth: expense.expense_type === "fixed_once" ? `${expense.expense_date.slice(0, 7)}-01` : null,
        })));
      setTransactions(transactionRows.map((row) => ({
        id: row.id,
        date: row.transaction_date,
        amountCents: Number(row.amount_cents),
        kind: row.kind,
        categoryId: row.category_id,
        merchant: row.normalized_merchant,
        currency: row.currency || "EUR",
      })));
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not load budgets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, anchor, unit]);

  const monthBudgets = useMemo(
    () => budgets.map((budget) => ({
      month: budget.effective_month,
      amountCents: Number(budget.amount_cents),
      active: budget.active,
      forecast: budget.forecast,
    })),
    [budgets]
  );
  const allowance = proratedAllowance(monthBudgets, range);
  const planned = fixedPlannedCents(charges, range);
  const budgetCents = allowance.cents + planned.cents;
  const byCategory = spendByCategory(transactions, currency);
  const spent = totalsFor(transactions, currency).netSpend;
  const percent = consumedPercent(spent, budgetCents || null);
  const elapsed = Math.min(inclusiveDays(range.start, formatISODate(new Date()) < range.end ? formatISODate(new Date()) : range.end), inclusiveDays(range.start, range.end));
  const elapsedRatio = inclusiveDays(range.start, range.end) === 0 ? 0 : Math.max(elapsed, 0) / inclusiveDays(range.start, range.end);
  const coverage = transactions.reduce<string | null>((latest, transaction) => (
    !latest || transaction.date > latest ? transaction.date : latest
  ), null);
  const pace = spendingPace({
    budgetCents: budgetCents || null,
    spentCents: spent,
    daysInPeriod: inclusiveDays(range.start, range.end),
    elapsedDays: anchor > formatISODate(new Date()) ? 0 : elapsed,
    forecast: "variable",
    coverageDate: coverage,
    periodEnd: range.end,
  });
  const insights = buildInsights({
    spentCents: spent,
    previousSpentCents: null,
    budgetCents: budgetCents || null,
    status: budgetStatus(spent, budgetCents || null, elapsedRatio),
    pace,
    comparisonLabel: "the previous period",
  });

  const saveDrafts = async () => {
    if (!user) return;
    try {
      for (const category of categories) {
        const raw = drafts[category.id];
        if (raw == null || raw.trim() === "") continue;
        const cents = Math.round(Number(raw.replace(",", ".")) * 100);
        if (!Number.isFinite(cents) || cents < 0) continue;
        await saveCategoryBudget({
          userId: user.id,
          categoryId: category.id,
          amountCents: cents,
          currency,
          effectiveMonth: month,
        });
      }
      showSuccess("Budgets saved");
      setManaging(false);
      await load();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not save budgets");
    }
  };

  if (authLoading || loading) {
    return <div className="mx-auto flex min-h-screen max-w-md items-center justify-center text-gray-500">Loading...</div>;
  }
  if (!user) return null;

  const over = budgetCents > 0 && spent > budgetCents;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-flowBg px-4 dark:bg-transparent">
      <Header />
      <main className="flex-1 space-y-3 pb-28 pt-20">
        <h1 className="text-center text-lg font-semibold tracking-wide text-flow-primary">MY BUDGET</h1>
        <PeriodControls
          label={formatPeriodLabel(unit, anchor, 1)}
          unit={unit}
          onUnit={setUnit}
          onPrevious={() => setAnchor(shiftAnchor(unit, anchor, -1, 1))}
          onNext={() => setAnchor(shiftAnchor(unit, anchor, 1, 1))}
        />

        <section className="rounded-3xl border border-gray-200 bg-white px-5 py-4 dark:border-transparent dark:bg-white/5">
          <p className="text-[11px] font-semibold uppercase text-gray-500">Total spending</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">{formatCents(spent, currency)}</p>
          <p className="text-sm text-gray-500">of {formatCents(budgetCents, currency)} budget{allowance.prorated ? " (prorated)" : ""}</p>
          {planned.cents > 0 && <p className="text-xs text-gray-500">{formatCents(planned.cents, currency)} comes from planned expenses</p>}
          <div className="mt-3"><ProgressBar value={percent ?? 0} color={over ? "#FB7185" : "#FF2D8A"} /></div>
          <p className={`mt-2 text-sm ${over ? "text-[#FB7185]" : "text-gray-600 dark:text-gray-300"}`}>
            {percent == null ? "No budget configured" : `${percent}% used`}
            {over ? ` — ${formatCents(spent - budgetCents, currency)} over budget` : budgetCents ? ` — ${formatCents(budgetCents - spent, currency)} left` : ""}
          </p>
        </section>

        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Budget by category</h2>
          <button type="button" onClick={() => setManaging(true)} className="text-sm font-medium text-flow-primary">Manage</button>
        </div>

        {categories.map((category) => {
          const direct = budgets.find((budget) => budget.category_id === category.id && budget.effective_month === month && budget.active);
          const variableCents = proratedAllowance(
            budgets.filter((budget) => budget.category_id === category.id).map((budget) => ({
              month: budget.effective_month,
              amountCents: Number(budget.amount_cents),
              active: budget.active,
              forecast: budget.forecast,
            })),
            range
          ).cents;
          const categoryBudget = variableCents + (planned.byCategory.get(category.id) ?? 0);
          const budgetCents = categoryBudget > 0 || direct ? categoryBudget : null;
          const categorySpend = byCategory.get(category.id) ?? 0;
          const categoryPercent = consumedPercent(categorySpend, budgetCents);
          const status = budgetStatus(categorySpend, budgetCents, elapsedRatio);
          const bar = status === "over" ? "#FB7185" : category.color;
          return (
            <Link
              key={category.id}
              href={`/transactions?category=${category.id}&month=${month.slice(0, 7)}`}
              className="block rounded-3xl border border-gray-200 bg-white px-4 py-3 dark:border-transparent dark:bg-white/5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold" style={{ backgroundColor: `${category.color}22`, color: category.color }}>
                  {category.name.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{category.name}</p>
                  <p className="text-xs text-gray-500">{categoryPercent == null ? statusLabel(status) : `${categoryPercent}% used`}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{formatCents(categorySpend, currency)}</p>
                  <p className="text-xs text-gray-500">{budgetCents == null ? "No budget" : `of ${formatCents(budgetCents, currency)}`}</p>
                </div>
              </div>
              <div className="mt-3"><ProgressBar value={categoryPercent ?? 0} color={bar} /></div>
              <p className={`mt-2 text-xs ${status === "over" ? "text-[#FB7185]" : "text-[#34D399]"}`}>
                {budgetCents == null ? "No budget configured" : categorySpend > budgetCents ? `Over budget by ${formatCents(categorySpend - budgetCents, currency)}` : `${formatCents(budgetCents - categorySpend, currency)} remaining`}
              </p>
            </Link>
          );
        })}

        <section className="rounded-3xl border border-gray-200 bg-white px-5 py-4 dark:border-transparent dark:bg-white/5">
          <p className="text-[11px] font-semibold uppercase text-gray-500">Spending pace</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {pace.estimate ? `Projected ${formatCents(pace.projectedCents ?? 0, currency)}.` : "Fixed budgets are not linearly forecast."}
            {pace.coverageLimited ? ` Estimate based on transactions through ${coverage}.` : ""}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-gray-50 p-3 dark:bg-white/5">
              <p className="text-[11px] text-gray-500">Projected spending</p>
              <p className="font-semibold tabular-nums text-gray-900 dark:text-white">{pace.projectedCents == null ? "—" : formatCents(pace.projectedCents, currency)}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-3 dark:bg-white/5">
              <p className="text-[11px] text-gray-500">Remaining per day</p>
              <p className="font-semibold tabular-nums text-gray-900 dark:text-white">{pace.remainingPerDayCents == null ? "—" : formatCents(pace.remainingPerDayCents, currency)}</p>
            </div>
          </div>
          {insights.map((insight) => (
            <p key={insight.id} className="mt-2 text-xs text-gray-600 dark:text-gray-300">{insight.text}</p>
          ))}
        </section>
      </main>
      <BottomNav />

      {managing && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 px-4 pb-6">
          <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-3xl bg-white p-5 dark:bg-[#24252C]">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Manage budgets</h2>
            <p className="mb-3 text-xs text-gray-500">These amounts are the variable allowance for {formatPeriodLabel("month", anchor)}. Planned expenses are already included in the budget.</p>
            <div className="space-y-2">
              {categories.map((category) => {
                const current = budgets.find((budget) => budget.category_id === category.id && budget.effective_month === month);
                return (
                  <label key={category.id} className="flex items-center justify-between gap-3 text-sm text-gray-900 dark:text-white">
                    {category.name}
                    <input
                      inputMode="decimal"
                      defaultValue={current ? (Number(current.amount_cents) / 100).toFixed(2) : ""}
                      onChange={(event) => setDrafts((previous) => ({ ...previous, [category.id]: event.target.value }))}
                      className="w-28 rounded-lg border border-gray-300 bg-white px-2 py-1 text-right dark:border-white/10 dark:bg-transparent"
                      aria-label={`${category.name} budget`}
                    />
                  </label>
                );
              })}
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" className="flex-1 rounded-xl border px-3 py-2 text-sm" onClick={() => setManaging(false)}>Close</button>
              <button
                type="button"
                className="flex-1 rounded-xl border px-3 py-2 text-sm"
                onClick={async () => {
                  if (!user) return;
                  const previous = shiftAnchor("month", anchor, -1);
                  const count = await duplicateBudgets(user.id, `${previous.slice(0, 7)}-01`, month, currency);
                  showSuccess(`Copied ${count} budget${count === 1 ? "" : "s"}`);
                  await load();
                }}
              >
                Copy previous
              </button>
              <button type="button" className="flex-1 rounded-xl bg-flow-primary px-3 py-2 text-sm text-white" onClick={saveDrafts}>Save</button>
            </div>
            {budgets.filter((budget) => budget.effective_month === month).map((budget) => (
              <button
                key={budget.id}
                type="button"
                className="mt-2 text-xs text-[#FB7185]"
                onClick={async () => {
                  if (!user) return;
                  await deleteCategoryBudget(user.id, budget.id);
                  await load();
                }}
              >
                Remove {categories.find((category) => category.id === budget.category_id)?.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
