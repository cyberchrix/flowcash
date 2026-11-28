"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Odometer } from "@/components/finance/Odometer";
import { formatCents, PeriodControls } from "@/components/finance/PeriodControls";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/contexts/ToastContext";
import { dayToDateString, getDayOfMonth } from "@/lib/date";
import { getCategories } from "@/lib/supabase/categories";
import { getCategoryBudgets } from "@/lib/supabase/budgets";
import { createExpense, getExpenses } from "@/lib/supabase/expenses";
import { deleteMonthOpening, getMonthOpenings, saveMonthOpening } from "@/lib/supabase/openings";
import { loadMonthStart } from "@/lib/supabase/settings";
import { ensureTransactionSync, getTransactions } from "@/lib/supabase/transactions";
import { categorizeWithModel } from "@/lib/transactions/categorizeWithModel";
import { fixedPlannedCents, PlannedCharge, proratedAllowance, upcomingFixedCharges } from "@/lib/finance/budget";
import { percentChange } from "@/lib/finance/insights";
import { invalidateBudgetCache } from "@/lib/finance/budgetCache";
import { monthFlowsFromTransactions, openingBalanceCents, parseOpeningInput, salaryLeftCents } from "@/lib/finance/openingBalance";
import { projectedSalaryLeftCents } from "@/lib/finance/pace";
import { formatISODate, formatPeriodLabel, inclusiveDays, PeriodUnit, rangeFor, shiftAnchor, shiftDate } from "@/lib/finance/period";
import { MonthStart, paydayByFundedMonth, salaryFetchStart, transactionMonth } from "@/lib/finance/salaryPeriod";
import { categoryAverageDelta, categoryAverageMonths, spendByCategory, spendByDay, SpendingTransaction, subscriptionCandidates, totalsFor } from "@/lib/finance/spending";
import { bankParentIds, incomeCategoryIds } from "@/lib/transactions/bankCategories";
import { categoryDisplayName } from "@/lib/transactions/categoryNames";
import { displayMerchant } from "@/lib/transactions/suggestCategory";

export const dynamic = "force-dynamic";

type CategoryRow = { id: string; name: string; nameEn: string | null; color: string; parentId: string | null };
type HistoryRow = SpendingTransaction & { name: string };

function formatMonthKey(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function isVariableSpendCategory(category: { name: string; nameEn?: string | null; name_en?: string | null }) {
  const name = categoryDisplayName(category);
  return name === "Groceries" || name === "Restaurants" || name === "Tobacco" || name === "Fuel";
}

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const { showError, showSuccess } = useToast();
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [budgets, setBudgets] = useState<Awaited<ReturnType<typeof getCategoryBudgets>>>([]);
  const [charges, setCharges] = useState<PlannedCharge[]>([]);
  const [openings, setOpenings] = useState<Record<string, number>>({});
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [balanceDraft, setBalanceDraft] = useState("");
  const [savingBalance, setSavingBalance] = useState(false);
  const [averageCategoryId, setAverageCategoryId] = useState<string | null>(null);
  const [savingSubscription, setSavingSubscription] = useState<string | null>(null);
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const [monthStart, setMonthStart] = useState<MonthStart>("salary");
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const wheelX = useRef(0);
  const swipeLock = useRef(0);
  const unit: PeriodUnit = "month";
  const [anchor, setAnchor] = useState(() => formatISODate(new Date()));
  const [loading, setLoading] = useState(true);
  const currency = "EUR";

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth");
  }, [user, authLoading, router]);

  const range = rangeFor(unit, anchor, 1);
  const previousAnchor = shiftAnchor(unit, anchor, -1, 1);
  const previousRange = rangeFor(unit, previousAnchor, 1);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setMonthStart(await loadMonthStart(user.id));
      const historyStart = ["2000-01-01", salaryFetchStart(range, unit), salaryFetchStart(previousRange, unit)].sort()[0];
      const [categoryRows, rows, budgetRows, expenseRows, openingRows] = await Promise.all([
        getCategories(user.id),
        getTransactions(user.id, { start: historyStart, end: range.end }),
        getCategoryBudgets(user.id, currency),
        getExpenses(user.id),
        getMonthOpenings(user.id),
      ]);
      setCategories(categoryRows.map((category) => ({ id: category.id, name: category.name, nameEn: category.name_en ?? null, color: category.color, parentId: category.parent_id ?? null })));
      setBudgets(budgetRows);
      const variableCategoryIds = new Set(categoryRows.filter((category) => isVariableSpendCategory({ name: category.name, name_en: category.name_en })).map((category) => category.id));
      setCharges((expenseRows ?? [])
        .filter((expense) => (expense.currency || "EUR") === currency)
        .map((expense) => ({
          categoryId: expense.category_id,
          amountCents: Math.round(Number(expense.amount) * 100),
          type: expense.category_id && variableCategoryIds.has(expense.category_id) ? "variable" as const : (expense.expense_type ?? "fixed_recurring"),
          active: expense.active !== false,
          day: getDayOfMonth(expense.expense_date),
          onceMonth: expense.expense_type === "fixed_once" ? `${expense.expense_date.slice(0, 7)}-01` : null,
          label: expense.label,
          matchPattern: expense.match_pattern ?? null,
        })));
      setOpenings(Object.fromEntries(openingRows.map((row) => [row.month, row.amountCents])));
      const mapped = rows.map((row) => ({
        id: row.id,
        date: row.transaction_date,
        amountCents: Number(row.amount_cents),
        kind: row.kind,
        categoryId: row.category_id,
        merchant: row.normalized_merchant,
        name: displayMerchant(row.full_label || row.normalized_merchant),
        currency: row.currency || "EUR",
      }));
      setHistory(mapped);
      setLoading(false);
      const [model, synced] = await Promise.all([
        categorizeWithModel(),
        ensureTransactionSync(user.id),
      ]);
      if (model.updated + synced > 0) {
        const fresh = await getTransactions(user.id, { start: historyStart, end: range.end });
        setHistory(fresh.map((row) => ({
          id: row.id,
          date: row.transaction_date,
          amountCents: Number(row.amount_cents),
          kind: row.kind,
          categoryId: row.category_id,
          merchant: row.normalized_merchant,
          name: displayMerchant(row.full_label || row.normalized_merchant),
          currency: row.currency || "EUR",
        })));
      }
    };
    load();
  }, [user, range.start, range.end, previousRange.start, previousRange.end]);

  const salaryCategoryIds = useMemo(
    () => incomeCategoryIds(categories),
    [categories]
  );
  const paydays = useMemo(
    () => paydayByFundedMonth(history, salaryCategoryIds),
    [history, salaryCategoryIds],
  );
  const monthKey = range.start.slice(0, 7);
  const previousMonthKey = previousRange.start.slice(0, 7);
  const transactions = history.filter((row) => transactionMonth(row.date, paydays, monthStart) === monthKey);
  const previous = history.filter((row) => transactionMonth(row.date, paydays, monthStart) === previousMonthKey);
  const totals = totalsFor(transactions, currency);
  const previousTotals = totalsFor(previous, currency);
  const flows = useMemo(
    () => monthFlowsFromTransactions(history, salaryCategoryIds, currency, monthStart),
    [history, salaryCategoryIds, monthStart],
  );
  const budgetParents = useMemo(
    () => bankParentIds(categories, transactions.map((transaction) => transaction.categoryId).filter((id): id is string => Boolean(id))),
    [categories, transactions],
  );
  const allowance = proratedAllowance(
    budgets
      .filter((budget) => budgetParents.has(budget.category_id))
      .map((budget) => ({
        month: budget.effective_month,
        amountCents: Number(budget.amount_cents),
        active: budget.active,
        forecast: budget.forecast,
      })),
    range,
  );
  const planned = fixedPlannedCents(charges, range);
  const plannedTotal = allowance.cents + planned.cents;
  const variableAllowances = useMemo(() => {
    const amounts = new Map<string, number>();
    for (const charge of charges) {
      if (!charge.active || charge.type !== "variable" || !charge.categoryId || charge.amountCents <= 0) continue;
      amounts.set(charge.categoryId, (amounts.get(charge.categoryId) ?? 0) + charge.amountCents);
    }
    return amounts;
  }, [charges]);
  const openingMap = useMemo(() => new Map(Object.entries(openings)), [openings]);
  const beforePayday = openingBalanceCents(monthKey, flows, openingMap);
  const projectedLeft = projectedSalaryLeftCents(
    salaryLeftCents(monthKey, flows, openingMap),
    plannedTotal,
    totals.netSpend,
  );
  const change = percentChange(totals.netSpend, previousTotals.netSpend);
  const byCategory = spendByCategory(transactions, currency);
  const averageDeltas = useMemo(
    () => categoryAverageDelta(history, currency, monthKey, (date) => transactionMonth(date, paydays, monthStart)),
    [history, monthKey, paydays, monthStart],
  );
  const monthOf = useMemo(() => (date: string) => transactionMonth(date, paydays, monthStart), [paydays, monthStart]);
  const subscriptions = useMemo(
    () => subscriptionCandidates(
      history,
      currency,
      charges.flatMap((charge) => charge.label ? [{ label: charge.label, amountCents: charge.amountCents }] : []),
      monthOf,
      (transaction) => (transaction as HistoryRow).name,
    ),
    [history, charges, monthOf],
  );
  const averageBreakdown = useMemo(
    () => averageCategoryId ? categoryAverageMonths(history, currency, monthKey, averageCategoryId, monthOf) : null,
    [averageCategoryId, history, monthKey, monthOf],
  );
  const slices = [...byCategory.entries()]
    .map(([categoryId, amount]) => ({
      category: categories.find((category) => category.id === categoryId) ?? { id: "none", name: "Uncategorized", color: "#A1A1A1" },
      amount,
    }))
    .filter((slice) => slice.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const gradient = useMemo(() => {
    const total = slices.reduce((sum, slice) => sum + slice.amount, 0);
    if (!total) return "transparent";
    let cursor = 0;
    const stops = slices.map((slice) => {
      const start = cursor;
      cursor += (slice.amount / total) * 100;
      return `${slice.category.color} ${start}% ${cursor}%`;
    });
    return `conic-gradient(${stops.join(",")})`;
  }, [slices]);

  const merchants = useMemo(() => {
    const map = new Map<string, { total: number; count: number; categoryId: string | null }>();
    for (const transaction of transactions) {
      if (transaction.currency !== currency || transaction.kind !== "expense" || transaction.amountCents >= 0) continue;
      const current = map.get(transaction.merchant) ?? { total: 0, count: 0, categoryId: transaction.categoryId };
      current.total += -transaction.amountCents;
      current.count += 1;
      map.set(transaction.merchant, current);
    }
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 8);
  }, [transactions]);

  const months = Array.from({ length: 6 }, (_, index) => shiftAnchor("month", anchor, index - 5, 1));

  if (authLoading || loading) {
    return <div className="mx-auto flex min-h-screen max-w-md items-center justify-center text-gray-500">Loading...</div>;
  }
  if (!user) return null;

  const payday = paydays.get(monthKey) ?? range.start;
  const nextPayday = [...paydays.values()].filter((date) => date > payday).sort()[0];
  const periodEnd = monthStart === "calendar" ? range.end : nextPayday ? shiftDate(nextPayday, -1) : range.end;
  const periodStart = monthStart === "calendar" ? range.start : payday;
  const today = formatISODate(new Date());
  const days = Math.max(inclusiveDays(periodStart, periodEnd < today ? periodEnd : today), 1);
  const upcoming = upcomingFixedCharges(
    charges,
    { start: periodStart, end: periodEnd },
    today,
    transactions.map((transaction) => ({ ...transaction, merchant: `${transaction.merchant} ${transaction.name}` })),
  );
  const averageCategory = categories.find((category) => category.id === averageCategoryId);
  const addSubscription = async (candidate: (typeof subscriptions)[number]) => {
    setSavingSubscription(candidate.merchant);
    try {
      await createExpense({
        user_id: user.id,
        label: candidate.merchant,
        amount: candidate.amountCents / 100,
        currency,
        category_id: candidate.categoryId,
        expense_date: dayToDateString(candidate.day),
        expense_type: "fixed_recurring",
        match_mode: "merchant",
        match_pattern: candidate.merchant,
        active: true,
      });
      setCharges((current) => [...current, {
        categoryId: candidate.categoryId,
        amountCents: candidate.amountCents,
        type: "fixed_recurring",
        active: true,
        day: candidate.day,
        onceMonth: null,
        label: candidate.merchant,
        matchPattern: candidate.merchant,
      }]);
      invalidateBudgetCache();
      showSuccess(`${candidate.merchant} added to planned expenses`);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not add the planned expense");
    } finally {
      setSavingSubscription(null);
    }
  };

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col overflow-hidden bg-flowBg px-4 dark:bg-transparent">
      <Header />
      <main
        className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-4 pt-20"
        onPointerDown={(event) => {
          if (balanceOpen || averageCategoryId || (event.pointerType === "mouse" && event.button !== 0)) return;
          swipe.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
        }}
        onPointerMove={(event) => {
          const start = swipe.current;
          if (!start || event.pointerId !== start.id) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.abs(dx) < 12 || Math.abs(dx) <= Math.abs(dy)) return;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={(event) => {
          const start = swipe.current;
          swipe.current = null;
          if (!start || event.pointerId !== start.id || balanceOpen || averageCategoryId) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) || Date.now() < swipeLock.current) return;
          swipeLock.current = Date.now() + 450;
          setAnchor((current) => shiftAnchor(unit, current, dx < 0 ? 1 : -1, 1));
        }}
        onPointerCancel={() => {
          swipe.current = null;
        }}
        onWheel={(event) => {
          if (balanceOpen || averageCategoryId || Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
            wheelX.current = 0;
            return;
          }
          wheelX.current += event.deltaX;
          if (Math.abs(wheelX.current) < 70 || Date.now() < swipeLock.current) return;
          const direction = wheelX.current > 0 ? 1 : -1;
          wheelX.current = 0;
          swipeLock.current = Date.now() + 450;
          setAnchor((current) => shiftAnchor(unit, current, direction, 1));
        }}
      >
        <PeriodControls
          label={formatPeriodLabel(unit, anchor, 1)}
          unit={unit}
          month={anchor.slice(0, 7)}
          onMonth={(value) => setAnchor(`${value}-01`)}
          onUnit={() => undefined}
          showUnits={false}
          onPrevious={() => setAnchor(previousAnchor)}
          onNext={() => setAnchor(shiftAnchor(unit, anchor, 1, 1))}
        />

        <section className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setBalanceDraft(`${beforePayday < 0 ? "-" : ""}${(Math.abs(beforePayday) / 100).toFixed(2).replace(".", ",")}`);
              setBalanceOpen(true);
            }}
            className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-left dark:border-transparent dark:bg-white/5"
          >
            <p className="text-[11px] uppercase text-gray-500">Income</p>
            <p className="flex flex-wrap items-baseline gap-x-1 text-sm font-semibold">
              <Odometer key={monthKey} className="text-[#34D399]" value={`+${formatCents(totals.income, currency)}`} />
              <span className="text-xs font-medium text-gray-400">
                / <Odometer key={`${monthKey}-balance`} value={formatCents(totals.income + beforePayday, currency)} />
              </span>
            </p>
            <p className={`mt-1 text-[11px] font-medium ${projectedLeft < 0 ? "text-red-400" : "text-gray-400"}`}>
              {formatCents(Math.abs(projectedLeft), currency)} {projectedLeft < 0 ? "over" : "left"}
            </p>
          </button>
          <article className="rounded-2xl border border-gray-200 bg-white px-3 py-3 dark:border-transparent dark:bg-white/5">
            <p className="text-[11px] uppercase text-gray-500">Spending</p>
            <p className="flex flex-wrap items-baseline gap-x-1 text-sm font-semibold">
              <Odometer
                key={`${monthKey}-spending`}
                className={totals.netSpend === 0 ? "text-gray-900 dark:text-white" : "text-red-400"}
                value={totals.netSpend === 0 ? formatCents(0, currency) : `-${formatCents(totals.netSpend, currency)}`}
              />
              <span className="text-xs font-medium text-gray-400">
                / <Odometer key={`${monthKey}-planned`} value={formatCents(plannedTotal, currency)} />
              </span>
            </p>
          </article>
          {[
            ["Cash flow", formatCents(totals.cashFlow, currency), "text-gray-900 dark:text-white"],
            ["Transactions", String(totals.count), "text-gray-900 dark:text-white"],
            ["Daily average", formatCents(Math.round(totals.netSpend / days), currency), "text-gray-900 dark:text-white"],
            ["Per transaction", formatCents(totals.count ? Math.round(totals.netSpend / totals.count) : 0, currency), "text-gray-900 dark:text-white"],
          ].map(([label, value, color]) => (
            <article key={label} className="rounded-2xl border border-gray-200 bg-white px-3 py-3 dark:border-transparent dark:bg-white/5">
              <p className="text-[11px] uppercase text-gray-500">{label}</p>
              <p className={`text-sm font-semibold ${color}`}><Odometer key={`${monthKey}-${label}`} value={value} /></p>
            </article>
          ))}
        </section>

        {balanceOpen && createPortal(
          <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={() => setBalanceOpen(false)}>
            <form
              role="dialog"
              aria-label="Balance at payday"
              className="my-auto max-h-full w-full max-w-md overflow-y-auto rounded-3xl bg-white p-4 dark:bg-[#18191E]"
              onClick={(event) => event.stopPropagation()}
              onSubmit={(event) => {
                event.preventDefault();
                void (async () => {
                  setSavingBalance(true);
                  try {
                    const cents = parseOpeningInput(balanceDraft);
                    const saved = openings[monthKey];
                    if (cents == null) {
                      if (saved != null) await deleteMonthOpening(user.id, monthKey);
                    } else if (cents !== saved && !(saved == null && cents === beforePayday)) {
                      await saveMonthOpening(user.id, monthKey, cents);
                    } else {
                      setBalanceOpen(false);
                      return;
                    }
                    setOpenings((current) => {
                      const next = { ...current };
                      if (cents == null) delete next[monthKey];
                      else next[monthKey] = cents;
                      return next;
                    });
                    invalidateBudgetCache();
                    setBalanceOpen(false);
                  } catch (error) {
                    showError(error instanceof Error ? error.message : "Could not save the balance");
                  } finally {
                    setSavingBalance(false);
                  }
                })();
              }}
            >
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Balance at payday</p>
              <p className="mt-1 text-xs text-gray-500">{monthStart === "salary" ? "The account balance when this salary arrived." : "The account balance on the first day of the month."} Use a minus if you were overdrawn. Leave empty to use the calculated balance.</p>
              <input
                autoFocus
                inputMode="decimal"
                aria-label="Balance at payday"
                value={balanceDraft}
                onChange={(event) => setBalanceDraft(event.target.value)}
                placeholder="-200,50"
                className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => setBalanceOpen(false)} className="flex-1 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 dark:bg-white/10 dark:text-gray-100">Cancel</button>
                <button type="submit" disabled={savingBalance} className="flex-1 rounded-xl bg-flow-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Save</button>
              </div>
            </form>
          </div>,
          document.body,
        )}

        {false && subscriptions.length > 0 && (
          <section className="rounded-3xl border border-gray-200 bg-white px-5 py-4 dark:border-transparent dark:bg-white/5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recurring charges</h2>
            <div className="mt-3 space-y-2">
              {subscriptions.slice(0, 8).map((candidate) => (
                <div key={candidate.merchant} className="flex items-center gap-3 text-sm">
                  <span className="min-w-0 flex-1 truncate text-gray-900 dark:text-white">{candidate.merchant}</span>
                  <span className="tabular-nums text-gray-500">{formatCents(candidate.amountCents, currency)}</span>
                  <button
                    type="button"
                    disabled={savingSubscription === candidate.merchant}
                    onClick={() => void addSubscription(candidate)}
                    className="rounded-lg bg-flow-primary px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {averageCategoryId && averageBreakdown && createPortal(
          <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={() => setAverageCategoryId(null)}>
            <div
              role="dialog"
              aria-label="Monthly average"
              className="my-auto max-h-full w-full max-w-md overflow-y-auto rounded-3xl bg-white p-4 dark:bg-[#18191E]"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{averageCategory ? categoryDisplayName(averageCategory) : "Category"}</p>
              <p className="mt-1 text-xs text-gray-500">Monthly average {formatCents(averageBreakdown.average, currency)}. An unusual month stays in the average.</p>
              <div className="mt-3 space-y-1">
                {averageBreakdown.months.map((month) => (
                  <div key={month.month} className={`flex items-baseline justify-between gap-3 rounded-xl px-2 py-1.5 text-sm ${month.outlier ? "bg-red-400/10" : ""}`}>
                    <span className="text-gray-900 dark:text-white">{formatMonthKey(month.month)}</span>
                    {month.outlier && <span className="text-[11px] font-medium text-red-400">Unusual</span>}
                    <span className={`tabular-nums ${month.outlier ? "text-red-400" : "text-gray-900 dark:text-white"}`}>{formatCents(month.cents, currency)}</span>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setAverageCategoryId(null)} className="mt-4 w-full rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 dark:bg-white/10 dark:text-gray-100">Close</button>
            </div>
          </div>,
          document.body,
        )}

        <section className="rounded-3xl border border-gray-200 bg-white px-5 py-4 dark:border-transparent dark:bg-white/5">
          <div className="relative mx-auto h-48 w-48 rounded-full" style={{ background: gradient }}>
            <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white text-center dark:bg-[#18191E]">
              <p className="text-[11px] uppercase text-gray-500">Total spending</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white"><Odometer key={`${monthKey}-total`} value={formatCents(totals.netSpend, currency)} /></p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {slices.map((slice) => {
              const delta = averageDeltas.get(slice.category.id) ?? 0;
              const variableAllowance = variableAllowances.get(slice.category.id);
              const variableLeft = variableAllowance == null ? null : variableAllowance - slice.amount;
              return (
              <Link key={slice.category.id} href={`/transactions?category=${slice.category.id}&month=${anchor.slice(0, 7)}`} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.category.color }} />
                <span className="min-w-0 flex-1 truncate text-gray-900 dark:text-white">{categoryDisplayName(slice.category)}</span>
                {variableLeft != null ? (
                  <span className={`shrink-0 text-[11px] tabular-nums ${variableLeft < 0 ? "text-red-400" : "text-gray-400"}`}>
                    {formatCents(Math.abs(variableLeft), currency)} {variableLeft < 0 ? "over" : "left"}
                  </span>
                ) : delta !== 0 && (
                  <button
                    type="button"
                    title="Compared with the monthly average since the start"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setAverageCategoryId(slice.category.id);
                    }}
                    className={`shrink-0 text-[11px] tabular-nums ${delta > 0 ? "text-red-400" : "text-[#34D399]"}`}
                  >
                    {delta > 0 ? "+" : "-"}{formatCents(Math.abs(delta), currency)}
                  </button>
                )}
                <span className="text-xs text-gray-500">{totals.netSpend ? Math.round((slice.amount / totals.netSpend) * 100) : 0}%</span>
                <span className="w-20 text-right tabular-nums text-gray-900 dark:text-white">{formatCents(slice.amount, currency)}</span>
              </Link>
              );
            })}
            {slices.length === 0 && <p className="text-sm text-gray-500">No categorized spending in this period.</p>}
          </div>
        </section>

        {upcoming.length > 0 && (
          <section className="rounded-3xl border border-gray-200 bg-white px-5 py-4 dark:border-transparent dark:bg-white/5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Still to come</h2>
              <p className="text-sm font-semibold text-gray-400">{formatCents(upcoming.reduce((sum, charge) => sum + charge.amountCents, 0), currency)}</p>
            </div>
            <div className="mt-3 space-y-2">
              {(upcomingOpen ? upcoming : upcoming.slice(0, 5)).map((charge) => (
                <div key={`${charge.label}-${charge.due}`} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 flex-1 truncate text-gray-900 dark:text-white">{charge.label}</span>
                  <span className="shrink-0 text-xs text-gray-500">{charge.due}</span>
                  <span className="w-20 text-right tabular-nums text-gray-900 dark:text-white">{formatCents(charge.amountCents, currency)}</span>
                </div>
              ))}
            </div>
            {upcoming.length > 5 && (
              <button type="button" onClick={() => setUpcomingOpen((open) => !open)} className="mt-3 text-sm font-medium text-flow-primary">
                {upcomingOpen ? "Show less" : `Show more · ${upcoming.length - 5}`}
              </button>
            )}
          </section>
        )}

        <section className="rounded-3xl border border-gray-200 bg-white px-5 py-4 dark:border-transparent dark:bg-white/5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Monthly spending</h2>
          <div className="mt-4 flex h-28 items-end gap-2">
            {months.map((monthAnchor) => {
              const inMonth = history.filter((row) => transactionMonth(row.date, paydays, monthStart) === monthAnchor.slice(0, 7));
              const amount = totalsFor(inMonth, currency).netSpend;
              const max = Math.max(...months.map((item) => {
                return totalsFor(history.filter((row) => transactionMonth(row.date, paydays, monthStart) === item.slice(0, 7)), currency).netSpend;
              }), 1);
              const selected = monthAnchor.slice(0, 7) === anchor.slice(0, 7);
              return (
                <div key={monthAnchor} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-24 w-full items-end">
                    <div className="w-full rounded-t-md" style={{ height: `${Math.max((amount / max) * 100, 4)}%`, backgroundColor: selected ? "#FF2D8A" : "#A855F7" }} title={formatCents(amount, currency)} />
                  </div>
                  <span className="text-[10px] text-gray-500">{monthAnchor.slice(5, 7)}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-gray-500">The current month is highlighted. An unfinished month is an incomplete total.</p>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white px-5 py-4 dark:border-transparent dark:bg-white/5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Top merchants</h2>
          <div className="mt-3 space-y-3">
            {merchants.map(([name, info], index) => (
              <Link key={name} href={`/transactions?month=${anchor.slice(0, 7)}`} className="flex items-center gap-3 text-sm">
                <span className="w-4 text-xs text-gray-400">{index + 1}</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-flow-primary/10 text-xs font-semibold text-flow-primary">{name.slice(0, 1)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-gray-900 dark:text-white">{name}</span>
                  <span className="text-[11px] text-gray-500">{info.count} transactions · {categories.find((category) => category.id === info.categoryId)?.name ?? "Uncategorized"}</span>
                </span>
                <span className="tabular-nums font-medium text-gray-900 dark:text-white">{formatCents(info.total, currency)}</span>
              </Link>
            ))}
            {merchants.length === 0 && <p className="text-sm text-gray-500">No merchants in this period.</p>}
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white px-5 py-4 dark:border-transparent dark:bg-white/5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Compared with the previous period</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {change == null
              ? "No equivalent spending in the previous period, so the percentage is not shown."
              : `${change > 0 ? "Up" : "Down"} ${formatCents(Math.abs(totals.netSpend - previousTotals.netSpend), currency)} (${Math.abs(change)}%).`}
          </p>
          <Cumulative days={spendByDay(transactions, currency)} />
        </section>
      </main>
      <BottomNav />
    </div>
  );
}

function Cumulative({ days }: { days: Map<string, number> }) {
  const entries = [...days.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let running = 0;
  const points = entries.map(([date, amount]) => {
    running += amount;
    return { date, running };
  });
  const max = Math.max(...points.map((point) => point.running), 1);
  if (points.length < 2) return null;
  const path = points.map((point, index) => {
    const x = (index / (points.length - 1)) * 100;
    const y = 40 - (point.running / max) * 36;
    return `${index === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 44" className="mt-3 h-24 w-full">
      <path d={path} fill="none" stroke="#FF2D8A" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
