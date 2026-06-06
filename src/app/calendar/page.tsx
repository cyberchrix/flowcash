"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { getExpenses } from "@/lib/supabase/expenses";
import { getDayOfMonth, ordinal } from "@/lib/date";
import { Database } from "@/types/database";

// Force dynamic rendering
export const dynamic = "force-dynamic";

type Expense = Database["public"]["Tables"]["expenses"]["Row"] & {
  categories: { name: string; color: string } | null;
};

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadExpenses = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const data = await getExpenses(user.id);
        setExpenses(data as Expense[]);
        setError(null);
      } catch (err) {
        console.error("Error loading expenses:", err);
        setError("Error loading expenses");
      } finally {
        setLoading(false);
      }
    };
    loadExpenses();
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [user, authLoading, router]);

  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  if (authLoading || loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 bg-flowBg">
        <div className="text-flowTextMuted">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirection en cours
  }

  // On ne garde que les charges actives (celles réellement prélevées)
  const activeExpenses = expenses.filter((e) => e.active !== false);

  // Total mensuel prélevé
  const monthlyTotal = activeExpenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );
  const currency = activeExpenses[0]?.currency || "EUR";

  // Regrouper par jour du mois (1-31)
  const groupedByDay = activeExpenses.reduce((acc, expense) => {
    const day = getDayOfMonth(expense.expense_date);
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(expense);
    return acc;
  }, {} as Record<number, Expense[]>);

  // Trier les jours du mois dans l'ordre croissant (du 1er au 31)
  const sortedDays = Object.entries(groupedByDay)
    .map(([day, items]) => [Number(day), items] as [number, Expense[]])
    .sort((a, b) => a[0] - b[0]);

  // Cumul prélevé au fil du mois
  let cumulative = 0;

  return (
    <>
      <div
        id="page-top-anchor"
        className="absolute top-0 left-0 w-1 h-1 opacity-0 pointer-events-none"
        aria-hidden="true"
      />
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 bg-flowBg dark:bg-transparent">
        <Header />

        <main className="flex-1 space-y-6 pt-20 pb-28">
          {/* Carte d'en-tête : total mensuel */}
          <div
            className="rounded-[28px] bg-white dark:bg-white/2 border border-gray-200 dark:border-transparent px-6 py-5"
            style={{ boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}
          >
            <h1 className="text-xs font-semibold text-gray-900 dark:text-white/50 uppercase mb-2">
              Monthly schedule
            </h1>
            <p className="text-sm text-flowTextMuted dark:text-gray-400 mb-4">
              When your charges are deducted during the month
            </p>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Total / month
              </span>
              <span className="text-lg font-semibold text-flow-primary">
                {formatCurrency(monthlyTotal, currency)}
              </span>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {sortedDays.length === 0 ? (
            <div className="rounded-[28px] bg-white dark:bg-white/2 border border-gray-200 dark:border-transparent px-6 py-12 text-center">
              <p className="text-gray-500 text-sm">No charges recorded</p>
              <p className="text-gray-400 text-xs mt-2">
                Add a charge to see when it is deducted
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedDays.map(([day, dayExpenses]) => {
                const dayTotal = dayExpenses.reduce(
                  (sum, e) => sum + Number(e.amount),
                  0
                );
                cumulative += dayTotal;
                const dayCurrency = dayExpenses[0]?.currency || "EUR";

                return (
                  <div
                    key={day}
                    className="rounded-[28px] bg-white dark:bg-white/2 border border-gray-200 dark:border-transparent px-6 py-5"
                    style={{ boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}
                  >
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full bg-flow-primary/10 dark:bg-flow-primary/20">
                          <span className="text-sm font-bold text-flow-primary leading-none">
                            {day}
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-gray-900 dark:text-white/50 uppercase">
                            {ordinal(day)} of the month
                          </span>
                          <span className="block text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                            Deducted so far: {formatCurrency(cumulative, dayCurrency)}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {formatCurrency(dayTotal, dayCurrency)}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {dayExpenses.map((expense) => {
                        const category = expense.categories;
                        const categoryColor = category?.color || "#A1A1A1";
                        const categoryName = category?.name || "Other";

                        return (
                          <div
                            key={expense.id}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div
                                className="h-10 w-1 rounded-full shrink-0"
                                style={{ backgroundColor: categoryColor }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {expense.label}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span
                                    className="h-2 w-2 rounded-full shrink-0"
                                    style={{ backgroundColor: categoryColor }}
                                  />
                                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {categoryName}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <span className="text-base font-semibold text-flow-primary shrink-0">
                              {formatCurrency(
                                Number(expense.amount),
                                expense.currency
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    </>
  );
}
