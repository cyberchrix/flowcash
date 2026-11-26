"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCategoryBudgets } from "@/lib/supabase/budgets";
import { getTransactions } from "@/lib/supabase/transactions";
import { formatCents } from "@/components/finance/PeriodControls";
import { expenseStatus, PlannedExpense, suggestLinks } from "@/lib/finance/reconcile";
import { SpendingTransaction, totalsFor } from "@/lib/finance/spending";
import { getDayOfMonth } from "@/lib/date";
import { saveConfirmedLinks } from "@/lib/supabase/reconciliation";

type ExpenseInput = {
  id: string;
  label: string;
  amount: number;
  currency: string;
  category_id: string | null;
  expense_date: string;
  active?: boolean;
  expense_type?: "fixed_recurring" | "fixed_once" | "variable";
  match_mode?: "merchant" | "category" | "manual" | "none";
  match_pattern?: string | null;
  amount_tolerance_cents?: number;
  date_tolerance_days?: number;
};

export function ReconciliationSummary({
  userId,
  expenses,
  onActual,
}: {
  userId: string;
  expenses: ExpenseInput[];
  onActual: (actual: Record<string, { cents: number; status: string }>) => void;
}) {
  const [summary, setSummary] = useState({ planned: 0, actual: 0 });
  const month = new Date().toISOString().slice(0, 7);
  const monthKey = `${month}-01`;

  useEffect(() => {
    const load = async () => {
      const [transactions, budgets] = await Promise.all([
        getTransactions(userId, { month }),
        getCategoryBudgets(userId, "EUR").catch(() => []),
      ]);
      const rows: SpendingTransaction[] = transactions.map((row) => ({
        id: row.id,
        date: row.transaction_date,
        amountCents: Number(row.amount_cents),
        kind: row.kind,
        categoryId: row.category_id,
        merchant: row.normalized_merchant,
        currency: row.currency || "EUR",
      }));
      const plannedExpenses: PlannedExpense[] = expenses.filter((expense) => expense.active !== false).map((expense) => ({
        id: expense.id,
        type: expense.expense_type ?? "fixed_recurring",
        amountCents: Math.round(Number(expense.amount) * 100),
        categoryId: expense.category_id,
        day: getDayOfMonth(expense.expense_date),
        active: true,
        matchMode: expense.match_mode ?? "none",
        matchPattern: expense.match_pattern || expense.label,
        amountToleranceCents: expense.amount_tolerance_cents ?? 0,
        dateToleranceDays: expense.date_tolerance_days ?? 2,
        currency: expense.currency || "EUR",
        onceMonth: expense.expense_type === "fixed_once" ? `${expense.expense_date.slice(0, 7)}-01` : null,
      }));
      const links = suggestLinks(plannedExpenses, rows, monthKey, new Set());
      await saveConfirmedLinks(userId, monthKey, plannedExpenses, links).catch(() => undefined);
      const actual: Record<string, { cents: number; status: string }> = {};
      let plannedFixed = 0;
      for (const expense of plannedExpenses) {
        if (expense.type === "variable") {
          const budget = budgets.find((item) => item.category_id === expense.categoryId && item.effective_month === monthKey && item.active);
          const planned = budget ? Number(budget.amount_cents) : 0;
          const spent = rows.filter((row) => row.categoryId === expense.categoryId).reduce((sum, row) => sum + Math.max(-row.amountCents, 0), 0);
          actual[expense.id] = {
            cents: spent,
            status: expenseStatus({ type: "variable", plannedCents: planned, actualCents: spent, expectedDate: null, today: new Date().toISOString().slice(0, 10), matched: false }),
          };
          continue;
        }
        plannedFixed += expense.amountCents;
        const matched = links.filter((link) => link.expenseId === expense.id);
        const cents = matched.reduce((sum, link) => sum + link.allocatedCents, 0);
        actual[expense.id] = {
          cents,
          status: expenseStatus({
            type: expense.type,
            plannedCents: expense.amountCents,
            actualCents: cents,
            expectedDate: `${month}-${String(expense.day).padStart(2, "0")}`,
            today: new Date().toISOString().slice(0, 10),
            matched: matched.length > 0,
          }),
        };
      }
      const variableBudgets = budgets.filter((budget) => budget.effective_month === monthKey && budget.active);
      const plannedVariable = variableBudgets.reduce((sum, budget) => sum + Number(budget.amount_cents), 0);
      setSummary({ planned: plannedFixed + plannedVariable, actual: totalsFor(rows, "EUR").netSpend });
      onActual(actual);
    };
    load().catch(() => undefined);
  }, [userId, expenses, month, monthKey, onActual]);

  return (
    <div className="mb-4 grid grid-cols-3 gap-2 text-center">
      <div>
        <p className="text-[11px] uppercase text-gray-500">Planned</p>
        <p className="text-sm font-semibold tabular-nums">{formatCents(summary.planned)}</p>
      </div>
      <div>
        <p className="text-[11px] uppercase text-gray-500">Actual</p>
        <p className="text-sm font-semibold tabular-nums">{formatCents(summary.actual)}</p>
      </div>
      <div>
        <p className="text-[11px] uppercase text-gray-500">Difference</p>
        <Link href="/budget" className="text-sm font-semibold tabular-nums text-flow-primary">{formatCents(summary.planned - summary.actual)}</Link>
      </div>
    </div>
  );
}
