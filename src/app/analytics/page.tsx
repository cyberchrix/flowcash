"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { formatCents, PeriodControls } from "@/components/finance/PeriodControls";
import { useAuth } from "@/hooks/useAuth";
import { getCategories } from "@/lib/supabase/categories";
import { getTransactions } from "@/lib/supabase/transactions";
import { categorizeWithModel } from "@/lib/transactions/categorizeWithModel";
import { percentChange } from "@/lib/finance/insights";
import { formatISODate, formatPeriodLabel, inclusiveDays, PeriodUnit, rangeFor, shiftAnchor, shiftDate } from "@/lib/finance/period";
import { spendByCategory, spendByDay, SpendingTransaction, totalsFor } from "@/lib/finance/spending";

export const dynamic = "force-dynamic";

type CategoryRow = { id: string; name: string; color: string };

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [history, setHistory] = useState<SpendingTransaction[]>([]);
  const [unit, setUnit] = useState<PeriodUnit>("month");
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
      const historyStart = shiftDate(range.end, -370);
      await categorizeWithModel();
      const [categoryRows, rows] = await Promise.all([
        getCategories(user.id),
        getTransactions(user.id, { start: historyStart, end: range.end }),
      ]);
      setCategories(categoryRows.map((category) => ({ id: category.id, name: category.name, color: category.color })));
      const mapped = rows.map((row) => ({
        id: row.id,
        date: row.transaction_date,
        amountCents: Number(row.amount_cents),
        kind: row.kind,
        categoryId: row.category_id,
        merchant: row.normalized_merchant,
        currency: row.currency || "EUR",
      }));
      setHistory(mapped);
      setLoading(false);
    };
    load();
  }, [user, range.start, range.end, previousRange.start, previousRange.end]);

  const transactions = history.filter((row) => row.date >= range.start && row.date <= range.end);
  const previous = history.filter((row) => row.date >= previousRange.start && row.date <= previousRange.end);
  const totals = totalsFor(transactions, currency);
  const previousTotals = totalsFor(previous, currency);
  const change = percentChange(totals.netSpend, previousTotals.netSpend);
  const byCategory = spendByCategory(transactions, currency);
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

  const days = Math.max(inclusiveDays(range.start, range.end), 1);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-flowBg px-4 dark:bg-transparent">
      <Header />
      <main className="flex-1 space-y-3 pb-28 pt-20">
        <h1 className="text-center text-lg font-semibold tracking-wide text-flow-primary">SPENDING ANALYTICS</h1>
        <PeriodControls
          label={formatPeriodLabel(unit, anchor, 1)}
          unit={unit}
          onUnit={setUnit}
          onPrevious={() => setAnchor(previousAnchor)}
          onNext={() => setAnchor(shiftAnchor(unit, anchor, 1, 1))}
        />

        <section className="grid grid-cols-2 gap-2">
          {[
            ["Spending", formatCents(totals.netSpend, currency)],
            ["Income", formatCents(totals.income, currency)],
            ["Cash flow", formatCents(totals.cashFlow, currency)],
            ["Transactions", String(totals.count)],
            ["Daily average", formatCents(Math.round(totals.netSpend / days), currency)],
            ["Per transaction", formatCents(totals.count ? Math.round(totals.netSpend / totals.count) : 0, currency)],
          ].map(([label, value]) => (
            <article key={label} className="rounded-2xl border border-gray-200 bg-white px-3 py-3 dark:border-transparent dark:bg-white/5">
              <p className="text-[11px] uppercase text-gray-500">{label}</p>
              <p className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{value}</p>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white px-5 py-4 dark:border-transparent dark:bg-white/5">
          <div className="relative mx-auto h-48 w-48 rounded-full" style={{ background: gradient }}>
            <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white text-center dark:bg-[#18191E]">
              <p className="text-[11px] uppercase text-gray-500">Total spending</p>
              <p className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">{formatCents(totals.netSpend, currency)}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {slices.map((slice) => (
              <Link key={slice.category.id} href={`/transactions?category=${slice.category.id}&month=${anchor.slice(0, 7)}`} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.category.color }} />
                <span className="flex-1 text-gray-900 dark:text-white">{slice.category.name}</span>
                <span className="text-xs text-gray-500">{totals.netSpend ? Math.round((slice.amount / totals.netSpend) * 100) : 0}%</span>
                <span className="w-20 text-right tabular-nums text-gray-900 dark:text-white">{formatCents(slice.amount, currency)}</span>
              </Link>
            ))}
            {slices.length === 0 && <p className="text-sm text-gray-500">No categorized spending in this period.</p>}
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white px-5 py-4 dark:border-transparent dark:bg-white/5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Monthly spending</h2>
          <div className="mt-4 flex h-28 items-end gap-2">
            {months.map((monthAnchor) => {
              const monthRange = rangeFor("month", monthAnchor, 1);
              const inMonth = history.filter((row) => row.date >= monthRange.start && row.date <= monthRange.end);
              const amount = totalsFor(inMonth, currency).netSpend;
              const max = Math.max(...months.map((item) => {
                const itemRange = rangeFor("month", item, 1);
                return totalsFor(history.filter((row) => row.date >= itemRange.start && row.date <= itemRange.end), currency).netSpend;
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
