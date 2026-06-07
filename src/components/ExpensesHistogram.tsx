"use client";

import { useState } from "react";
import { getDayOfMonth, ordinal } from "@/lib/date";
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
  type DayInfo = { day: number; amount: number };
  const [selected, setSelected] = useState<DayInfo | null>(null);
  const [hovered, setHovered] = useState<DayInfo | null>(null);
  const active = hovered ?? selected;

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

  const formatFull = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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
              {totals.map((t, i) => {
                const day = i + 1;
                const showBar = t > 0;
                const isActive = active?.day === day;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t-[2px] bg-flow-primary transition-opacity"
                    style={{
                      height: showBar ? `${Math.max((t / max) * 100, 6)}%` : "2px",
                      opacity: showBar ? (active && !isActive ? 0.4 : 1) : 0.12,
                      cursor: showBar ? "pointer" : "default",
                    }}
                    onMouseEnter={() => showBar && setHovered({ day, amount: t })}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() =>
                      showBar &&
                      setSelected((prev) =>
                        prev?.day === day ? null : { day, amount: t }
                      )
                    }
                  />
                );
              })}
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

      {hasData && (
        <div className="mt-3 h-5 text-center text-xs">
          {active ? (
            <span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {ordinal(active.day)} of the month
              </span>
              <span className="mx-1.5 text-gray-300 dark:text-gray-600">·</span>
              <span className="font-semibold text-flow-primary">
                {formatFull(active.amount)}
              </span>
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">
              Tap a bar to see details
            </span>
          )}
        </div>
      )}
    </section>
  );
}
