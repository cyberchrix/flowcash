"use client";

import { getDayOfMonth } from "@/lib/date";
import { Database } from "@/types/database";

type Expense = Database["public"]["Tables"]["expenses"]["Row"];

interface ExpensesHistogramProps {
  expenses: Expense[];
  currency?: string;
}

const DAYS_IN_MONTH = 31;

export function ExpensesHistogram({
  expenses,
  currency = "EUR",
}: ExpensesHistogramProps) {
  const totals = new Array(DAYS_IN_MONTH).fill(0);
  expenses
    .filter((e) => e.active !== false)
    .forEach((e) => {
      const day = getDayOfMonth(e.expense_date);
      if (day >= 1 && day <= DAYS_IN_MONTH) {
        totals[day - 1] += Number(e.amount);
      }
    });

  const max = Math.max(...totals, 1);
  const hasData = totals.some((t) => t > 0);

  const formatAmount = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);

  return (
    <section
      className="rounded-[28px] bg-white dark:bg-white/2 border border-gray-200 dark:border-transparent px-6 py-4"
      style={{ boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}
    >
      <h2 className="text-xs font-semibold text-gray-900 dark:text-white/50 uppercase mb-3">
        Expenses by day
      </h2>

      {hasData ? (
        <div className="flex gap-2">
          {/* Y axis (amounts) */}
          <div className="flex h-20 flex-col justify-between text-right text-[9px] leading-none text-gray-400 dark:text-gray-500">
            <span>{formatAmount(max)}</span>
            <span>{formatAmount(max / 2)}</span>
            <span>0</span>
          </div>

          {/* Bars */}
          <div className="flex-1">
            <div className="flex h-20 items-end gap-px border-b border-gray-100 dark:border-white/10">
              {totals.map((t, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-[2px] bg-flow-primary"
                  style={{
                    height: t > 0 ? `${Math.max((t / max) * 100, 6)}%` : "2px",
                    opacity: t > 0 ? 1 : 0.12,
                  }}
                  title={t > 0 ? `Day ${i + 1}` : undefined}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
              <span>1</span>
              <span>15</span>
              <span>31</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="py-6 text-center text-xs text-gray-400 dark:text-gray-500">
          No expenses to display
        </p>
      )}
    </section>
  );
}
