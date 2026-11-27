"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { CategoryIcon } from "@/components/finance/categoryIcon";
import { formatCents, PeriodControls, ProgressBar } from "@/components/finance/PeriodControls";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/contexts/ToastContext";
import { getDayOfMonth } from "@/lib/date";
import { getCategories } from "@/lib/supabase/categories";
import { getExpenses } from "@/lib/supabase/expenses";
import { deleteCategoryBudget, duplicateBudgets, getCategoryBudgets, saveCategoryBudget } from "@/lib/supabase/budgets";
import { ensureTransactionSync, getTransactions } from "@/lib/supabase/transactions";
import { categorizeWithModel } from "@/lib/transactions/categorizeWithModel";
import { bankParentIds, categoryRoot, incomeCategoryIds } from "@/lib/transactions/bankCategories";
import { categoryDisplayName } from "@/lib/transactions/categoryNames";
import { displayMerchant, isIncomeCategory } from "@/lib/transactions/suggestCategory";
import { salaryFetchStart, transactionInPeriod } from "@/lib/finance/salaryPeriod";
import { budgetStatus, consumedPercent, fixedPlannedCents, PlannedCharge, proratedAllowance, statusLabel } from "@/lib/finance/budget";
import { buildInsights } from "@/lib/finance/insights";
import { spendingPace } from "@/lib/finance/pace";
import { invalidateBudgetCache, readBudgetCache, writeBudgetCache } from "@/lib/finance/budgetCache";
import { formatISODate, formatPeriodLabel, inclusiveDays, PeriodUnit, rangeFor, shiftAnchor } from "@/lib/finance/period";
import { spendByCategory, SpendingTransaction, totalsFor } from "@/lib/finance/spending";

export const dynamic = "force-dynamic";

type CategoryRow = { id: string; name: string; nameEn: string | null; nameFr: string | null; color: string; parentId: string | null };

function toCategoryRows(rows: { id: string; name: string; name_en?: string | null; name_fr?: string | null; color: string; parent_id?: string | null }[]): CategoryRow[] {
  return rows.map((category) => ({ id: category.id, name: category.name, nameEn: category.name_en ?? null, nameFr: category.name_fr ?? null, color: category.color, parentId: category.parent_id ?? null }));
}
type TodayRow = {
  id: string;
  label: string;
  amountCents: number;
  kind: SpendingTransaction["kind"];
  categoryId: string | null;
};
type BudgetSnapshot = {
  categories: CategoryRow[];
  transactions: SpendingTransaction[];
  today: TodayRow[];
  budgets: Awaited<ReturnType<typeof getCategoryBudgets>>;
  charges: PlannedCharge[];
};

export default function BudgetPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [transactions, setTransactions] = useState<SpendingTransaction[]>([]);
  const [todayRows, setTodayRows] = useState<TodayRow[]>([]);
  const [budgets, setBudgets] = useState<Awaited<ReturnType<typeof getCategoryBudgets>>>([]);
  const [charges, setCharges] = useState<PlannedCharge[]>([]);
  const [unit, setUnit] = useState<PeriodUnit>("month");
  const [anchor, setAnchor] = useState(() => formatISODate(new Date()));
  const [loading, setLoading] = useState(true);
  const [shownKey, setShownKey] = useState("");
  const [managing, setManaging] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const request = useRef(0);
  const currency = "EUR";

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth");
  }, [user, authLoading, router]);

  const range = rangeFor(unit, anchor, 1);
  const month = `${range.start.slice(0, 7)}-01`;

  const applySnapshot = (snapshot: BudgetSnapshot, key: string) => {
    setCategories(snapshot.categories);
    setBudgets(snapshot.budgets);
    setCharges(snapshot.charges);
    setTransactions(snapshot.transactions);
    setTodayRows(snapshot.today ?? []);
    setShownKey(key);
  };

  const load = async () => {
    if (!user) return;
    const id = ++request.current;
    const cacheKey = `${user.id}:${range.start}:${range.end}:today`;
    const cached = readBudgetCache<BudgetSnapshot>(cacheKey);
    if (cached) applySnapshot(cached, cacheKey);
    else setLoading(true);
    try {
      const today = formatISODate(new Date());
      const [categoryRows, budgetRows, transactionRows, expenseRows, todaySource] = await Promise.all([
        getCategories(user.id),
        getCategoryBudgets(user.id, currency),
        getTransactions(user.id, { start: salaryFetchStart(range, unit), end: range.end }),
        getExpenses(user.id),
        getTransactions(user.id, { start: today, end: today }),
      ]);
      const salaryCategoryIds = incomeCategoryIds(toCategoryRows(categoryRows));
      const toSpending = (row: (typeof transactionRows)[number]) => ({
        id: row.id,
        date: row.transaction_date,
        amountCents: Number(row.amount_cents),
        kind: row.kind,
        categoryId: row.category_id,
        merchant: row.normalized_merchant,
        currency: row.currency || "EUR",
      });
      const toToday = (row: (typeof todaySource)[number]): TodayRow => ({
        id: row.id,
        label: row.full_label || row.normalized_merchant,
        amountCents: Number(row.amount_cents),
        kind: row.kind,
        categoryId: row.category_id,
      });
      const snapshot: BudgetSnapshot = {
        categories: toCategoryRows(categoryRows),
        budgets: budgetRows,
        charges: expenseRows
          .filter((expense) => (expense.currency || "EUR") === currency)
          .map((expense) => ({
            categoryId: expense.category_id,
            amountCents: Math.round(Number(expense.amount) * 100),
            type: expense.expense_type ?? "fixed_recurring",
            active: expense.active !== false,
            day: getDayOfMonth(expense.expense_date),
            onceMonth: expense.expense_type === "fixed_once" ? `${expense.expense_date.slice(0, 7)}-01` : null,
          })),
        transactions: transactionRows
          .map(toSpending)
          .filter((transaction) => transactionInPeriod(transaction, range, unit, salaryCategoryIds)),
        today: todaySource.map(toToday),
      };
      if (id !== request.current) return;
      writeBudgetCache(cacheKey, snapshot);
      applySnapshot(snapshot, cacheKey);
      setLoading(false);
      const [model, synced] = await Promise.all([
        categorizeWithModel(),
        ensureTransactionSync(user.id),
      ]);
      if (id !== request.current) return;
      if (model.updated + synced > 0) {
        const [freshCategories, freshRows, freshToday] = await Promise.all([
          getCategories(user.id),
          getTransactions(user.id, { start: salaryFetchStart(range, unit), end: range.end }),
          getTransactions(user.id, { start: today, end: today }),
        ]);
        const freshSalaryIds = incomeCategoryIds(toCategoryRows(freshCategories));
        const fresh = {
          ...snapshot,
          categories: toCategoryRows(freshCategories),
          transactions: freshRows
            .map(toSpending)
            .filter((transaction) => transactionInPeriod(transaction, range, unit, freshSalaryIds)),
          today: freshToday.map(toToday),
        };
        writeBudgetCache(cacheKey, fresh);
        applySnapshot(fresh, cacheKey);
      }
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

  const ready = shownKey === `${user?.id ?? ""}:${range.start}:${range.end}:today`;
  const visibleTransactions = ready ? transactions : [];
  const parentById = useMemo(() => new Map(categories.map((category) => [category.id, category.parentId])), [categories]);
  const parents = useMemo(
    () => bankParentIds(categories, visibleTransactions.map((transaction) => transaction.categoryId).filter((id): id is string => Boolean(id))),
    [categories, visibleTransactions]
  );
  const monthBudgets = useMemo(
    () => budgets.filter((budget) => parents.has(budget.category_id)).map((budget) => ({
      month: budget.effective_month,
      amountCents: Number(budget.amount_cents),
      active: budget.active,
      forecast: budget.forecast,
    })),
    [budgets, parents]
  );
  const allowance = proratedAllowance(monthBudgets, range);
  const planned = fixedPlannedCents(charges, range);
  const budgetCents = allowance.cents + planned.cents;
  const byCategory = spendByCategory(visibleTransactions, currency);
  const spendByParent = new Map<string, number>();
  for (const [categoryId, amount] of byCategory) {
    const root = categoryRoot(categoryId, parentById);
    if (!root) continue;
    spendByParent.set(root, (spendByParent.get(root) ?? 0) + amount);
  }
  const plannedByParent = new Map<string, number>();
  for (const [categoryId, amount] of planned.byCategory) {
    const root = categoryRoot(categoryId, parentById);
    if (!root || !parents.has(root)) continue;
    plannedByParent.set(root, (plannedByParent.get(root) ?? 0) + amount);
  }
  const incomeIds = incomeCategoryIds(categories);
  const incomeByParent = new Map<string, number>();
  for (const transaction of visibleTransactions) {
    if (transaction.kind !== "income" || transaction.currency !== currency || transaction.amountCents <= 0) continue;
    const root = categoryRoot(transaction.categoryId, parentById);
    if (!root) continue;
    incomeByParent.set(root, (incomeByParent.get(root) ?? 0) + transaction.amountCents);
  }
  const expenseSlices = rankedCategorySlices(spendByParent, categories, (category) => !incomeIds.has(category.id));
  const incomeSlices = rankedCategorySlices(incomeByParent, categories, () => true);
  const periodTotals = totalsFor(visibleTransactions, currency);
  const spent = periodTotals.netSpend;
  const elapsed = Math.min(inclusiveDays(range.start, formatISODate(new Date()) < range.end ? formatISODate(new Date()) : range.end), inclusiveDays(range.start, range.end));
  const elapsedRatio = inclusiveDays(range.start, range.end) === 0 ? 0 : Math.max(elapsed, 0) / inclusiveDays(range.start, range.end);
  const coverage = visibleTransactions.reduce<string | null>((latest, transaction) => (
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

  const remainingCents = budgetCents - spent;
  const over = budgetCents > 0 && remainingCents < 0;
  const salaryLeftCents = periodTotals.income - spent;
  const salaryOver = salaryLeftCents < 0;

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col overflow-hidden bg-flowBg px-4 dark:bg-transparent">
      <Header />
      <main className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-4 pt-20">
        <h1 className="text-center text-lg font-semibold tracking-wide text-flow-primary">MY BUDGET</h1>
        <PeriodControls
          label={formatPeriodLabel(unit, anchor, 1)}
          unit={unit}
          month={anchor.slice(0, 7)}
          onMonth={(value) => setAnchor(`${value}-01`)}
          onUnit={setUnit}
          onPrevious={() => setAnchor(shiftAnchor(unit, anchor, -1, 1))}
          onNext={() => setAnchor(shiftAnchor(unit, anchor, 1, 1))}
        />

        <section
          className="relative overflow-hidden rounded-[24px] px-6 py-6 text-white"
          style={{
            fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "Courier New", monospace',
            background: "linear-gradient(to right, #FF2D8A, #8A2BFF, #316CFF)",
            letterSpacing: "0.5px",
          }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-20">
            <svg viewBox="0 0 1200 320" className="absolute bottom-0 left-0 h-[120%] w-full" preserveAspectRatio="none">
              <path d="M0,160L48,144C96,128,192,96,288,101.3C384,107,480,149,576,154.7C672,160,768,128,864,112C960,96,1056,96,1152,112C1248,128,1344,160,1392,176L1440,192L1440,320L0,320Z" fill="white" opacity="0.3" />
              <path d="M0,192L48,181.3C96,171,192,149,288,154.7C384,160,480,192,576,186.7C672,181,768,139,864,122.7C960,107,1056,117,1152,133.3C1248,149,1344,171,1392,181.3L1440,192L1440,320L0,320Z" fill="white" opacity="0.2" />
            </svg>
          </div>
          <div className="relative z-10 flex items-end justify-between gap-4">
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-sm font-medium uppercase text-white/90">
                  {salaryOver ? "Over salary" : "Salary left"}
                </p>
                <div
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-bold"
                  style={{ backgroundColor: !ready ? "rgba(255,255,255,0.25)" : salaryOver ? "rgba(239, 68, 68, 0.8)" : "rgba(99, 216, 179, 0.8)" }}
                >
                  {ready && <span className="text-2xl">{salaryOver ? "-" : "+"}</span>}
                  <span className="text-2xl" style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.4)" }}>
                    {ready ? `${Math.abs(Math.round(salaryLeftCents / 100)).toLocaleString("fr-FR")} €` : "—"}
                  </span>
                </div>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium uppercase text-white/90">
                  {budgetCents > 0 ? (over ? "Over budget" : "Budget left") : "Total spending"}
                </p>
                <div
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-bold"
                  style={{ backgroundColor: !ready || budgetCents <= 0 ? "rgba(255,255,255,0.25)" : over ? "rgba(239, 68, 68, 0.8)" : "rgba(99, 216, 179, 0.8)" }}
                >
                  {ready && budgetCents > 0 && <span className="text-2xl">+</span>}
                  <span className="text-2xl" style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.4)" }}>
                    {ready ? `${Math.abs(Math.round((budgetCents > 0 ? remainingCents : spent) / 100)).toLocaleString("fr-FR")} €` : "Loading..."}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-3 text-right">
              {[
                ["Income", periodTotals.income],
                ["Spending", spent],
                ["Budget", budgetCents],
              ].map(([label, cents]) => (
                <div key={String(label)}>
                  <p className="text-[11px] uppercase text-white/90">{label}</p>
                  <p className="text-sm font-bold leading-tight" style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.4)" }}>
                    {ready ? `${(Number(cents) / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <FlowSplitCard
            title="Spending"
            amount={ready ? formatCents(spent, currency) : "—"}
            amountClass="text-gray-900 dark:text-white"
            total={ready ? spent : 0}
            slices={expenseSlices}
            month={month.slice(0, 7)}
          />
          <FlowSplitCard
            title="Income"
            amount={ready ? formatCents(periodTotals.income, currency) : "—"}
            amountClass="text-[#34D399]"
            total={ready ? periodTotals.income : 0}
            slices={incomeSlices}
            month={month.slice(0, 7)}
          />
        </section>

        <section>
          <h2 className="px-1 text-base font-semibold text-gray-900 dark:text-white">Today</h2>
          {!ready ? null : todayRows.length === 0 ? (
            <p className="mt-2 px-1 text-sm text-gray-500">No transactions today.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {todayRows.map((row) => {
                const category = categories.find((item) => item.id === row.categoryId);
                const amount = row.kind === "expense" ? -row.amountCents : row.amountCents;
                const content = (
                  <>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${category?.color ?? "#A1A1A1"}22`, color: category?.color ?? "#A1A1A1" }}>
                      <CategoryIcon name={category?.name ?? "Other"} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{displayMerchant(row.label)}</span>
                      <span className="block text-xs text-gray-500">{category?.name ?? "Uncategorized"}</span>
                    </span>
                    <span className={`text-sm font-semibold tabular-nums ${row.kind === "income" ? "text-[#34D399]" : "text-gray-900 dark:text-white"}`}>{formatCents(amount)}</span>
                  </>
                );
                const className = "flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-3 dark:border-transparent dark:bg-white/5";
                return (
                  <li key={row.id}>
                    {category ? (
                      <Link href={`/budget/${categoryRoot(category.id, parentById) ?? category.id}?month=${formatISODate(new Date()).slice(0, 7)}`} className={className}>{content}</Link>
                    ) : (
                      <div className={className}>{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Budget by category</h2>
          <button type="button" onClick={() => setManaging(true)} className="text-sm font-medium text-flow-primary">Manage</button>
        </div>

        {ready && <div className="grid grid-cols-2 gap-3">{categories.filter((category) => parents.has(category.id) && !isIncomeCategory(category.name) && ((spendByParent.get(category.id) ?? 0) > 0 || budgets.some((budget) => budget.category_id === category.id && budget.active)))
          .sort((a, b) => (spendByParent.get(b.id) ?? 0) - (spendByParent.get(a.id) ?? 0))
          .map((category) => {
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
          const categoryBudget = variableCents + (plannedByParent.get(category.id) ?? 0);
          const budgetCents = categoryBudget > 0 || direct ? categoryBudget : null;
          const categorySpend = spendByParent.get(category.id) ?? 0;
          const categoryPercent = consumedPercent(categorySpend, budgetCents);
          const status = budgetStatus(categorySpend, budgetCents, elapsedRatio);
          const bar = status === "over" ? "#FB7185" : category.color;
          return (
            <Link
              key={category.id}
              href={`/budget/${category.id}?month=${month.slice(0, 7)}`}
              className="flex min-h-36 flex-col rounded-3xl border border-gray-200 bg-white px-3 py-3 dark:border-transparent dark:bg-white/5"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl" style={{ backgroundColor: `${category.color}22`, color: category.color }}>
                <CategoryIcon name={category.name} className="h-5 w-5" />
              </span>
              <p className="mt-2 truncate text-sm font-medium text-gray-900 dark:text-white">{categoryDisplayName(category)}</p>
              <p className={`mt-1 text-base font-semibold tabular-nums ${status === "over" ? "text-[#FB7185]" : "text-gray-900 dark:text-white"}`}>{formatCents(categorySpend, currency)}</p>
              <p className="text-[11px] text-gray-500">{budgetCents == null ? "No budget" : `of ${formatCents(budgetCents, currency)}`}</p>
              <div className="mt-2"><ProgressBar value={categoryPercent ?? 0} color={bar} /></div>
              <p className={`mt-2 text-[11px] leading-snug ${status === "over" ? "text-[#FB7185]" : "text-[#34D399]"}`}>
                {budgetCents == null ? "No budget configured" : categorySpend > budgetCents ? `Over by ${formatCents(categorySpend - budgetCents, currency)}` : `${formatCents(budgetCents - categorySpend, currency)} left`}
              </p>
            </Link>
          );
        })}</div>}

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
              {categories.filter((category) => parents.has(category.id) && !isIncomeCategory(category.name)).map((category) => {
                const current = budgets.find((budget) => budget.category_id === category.id && budget.effective_month === month);
                return (
                  <label key={category.id} className="flex items-center justify-between gap-3 text-sm text-gray-900 dark:text-white">
                    {categoryDisplayName(category)}
                    <input
                      inputMode="decimal"
                      defaultValue={current ? (Number(current.amount_cents) / 100).toFixed(2) : ""}
                      onChange={(event) => setDrafts((previous) => ({ ...previous, [category.id]: event.target.value }))}
                      className="w-28 rounded-lg border border-gray-300 bg-white px-2 py-1 text-right dark:border-white/10 dark:bg-transparent"
                      aria-label={`${categoryDisplayName(category)} budget`}
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
            {budgets.filter((budget) => budget.effective_month === month && parents.has(budget.category_id)).map((budget) => (
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
                Remove {categoryDisplayName(categories.find((category) => category.id === budget.category_id) ?? { name: "category" })}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type FlowSlice = { id: string; name: string; color: string; amount: number };

function rankedCategorySlices(
  totals: Map<string, number>,
  categories: CategoryRow[],
  include: (category: CategoryRow) => boolean,
) {
  return [...totals.entries()]
    .filter(([, amount]) => amount > 0)
    .flatMap(([id, amount]) => {
      const category = categories.find((item) => item.id === id);
      if (!category || !include(category)) return [];
      return [{ id, name: categoryDisplayName(category), color: category.color, amount }];
    })
    .sort((left, right) => right.amount - left.amount);
}

function FlowSplitCard({
  title,
  amount,
  amountClass,
  total,
  slices,
  month,
}: {
  title: string;
  amount: string;
  amountClass: string;
  total: number;
  slices: FlowSlice[];
  month: string;
}) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const gap = slices.length > 1 ? 4 : 0;
  let cursor = 0;
  const arcs = total > 0 ? slices.map((slice) => {
    const length = Math.max((slice.amount / total) * circumference - gap, 0);
    const arc = { color: slice.color, length, offset: cursor };
    cursor += length + gap;
    return arc;
  }) : [];

  return (
    <article className="rounded-3xl border border-gray-200 bg-white px-3 py-3 dark:border-transparent dark:bg-white/5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      <div className="relative mx-auto mt-2 h-[7.25rem] w-[7.25rem]">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" className="stroke-gray-100 dark:stroke-white/10" strokeWidth="9" />
          {arcs.map((arc, index) => (
            <circle
              key={`${arc.color}-${index}`}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth="9"
              strokeDasharray={`${arc.length} ${circumference}`}
              strokeDashoffset={-arc.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-6 flex items-center justify-center text-center">
          <p className={`px-1 text-[11px] font-semibold leading-tight tabular-nums ${amountClass}`}>{amount}</p>
        </div>
      </div>
      <ul className="mt-2 space-y-1.5">
        {slices.slice(0, 3).map((slice) => (
          <li key={slice.id}>
            <Link href={`/budget/${slice.id}?month=${month}`} className="flex items-center gap-1.5 text-[11px]">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
              <span className="min-w-0 flex-1 truncate text-gray-700 dark:text-gray-300">{slice.name}</span>
              <span className={`shrink-0 font-medium tabular-nums ${amountClass}`}>{formatCents(slice.amount)}</span>
            </Link>
          </li>
        ))}
        {slices.length === 0 && <li className="text-[11px] text-gray-500">Nothing this period.</li>}
      </ul>
    </article>
  );
}
