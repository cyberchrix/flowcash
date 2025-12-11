"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { getExpenses, deleteExpense, updateExpense } from "@/lib/supabase/expenses";
import { TrashIcon, PencilIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Database } from "@/types/database";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

type Expense = Database["public"]["Tables"]["expenses"]["Row"] & {
  categories: { name: string; color: string } | null;
};

export default function ExpensesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    loadExpenses();
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [user, authLoading, router]);

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setEditLabel(expense.label);
    setEditAmount(expense.amount.toString());
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditLabel("");
    setEditAmount("");
    setError(null);
  };

  const handleSaveEdit = async (expenseId: string, currency: string) => {
    const parsedAmount = parseFloat(editAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Amount must be a positive number");
      return;
    }

    if (!editLabel.trim()) {
      setError("Label cannot be empty");
      return;
    }

    setError(null);

    try {
      await updateExpense(expenseId, {
        label: editLabel.trim(),
        amount: parsedAmount,
      });
      await loadExpenses();
      setEditingId(null);
      setEditLabel("");
      setEditAmount("");
    } catch (err) {
      console.error("Error updating expense:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Error updating expense"
      );
    }
  };

  const handleDelete = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) {
      return;
    }

    setDeletingId(expenseId);
    setError(null);

    try {
      await deleteExpense(expenseId);
      // Recharger la liste
      await loadExpenses();
    } catch (err) {
      console.error("Error deleting expense:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Error deleting expense"
      );
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

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

  return (
    <>
      <div id="page-top-anchor" className="absolute top-0 left-0 w-1 h-1 opacity-0 pointer-events-none" aria-hidden="true" />
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 bg-flowBg">
      <Header />

      <main className="flex-1 space-y-6 pt-20 pb-28">
        <div
          className="rounded-[28px] bg-white border border-gray-200 px-6 py-5"
          style={{
            fontFamily:
              'Inter Variable, ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", Segoe UI Symbol, "Noto Color Emoji"',
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          }}
        >
          <h1 className="text-2xl font-semibold text-flow-primary mb-2">
            My Expenses
          </h1>
          <p className="text-sm text-flowTextMuted mb-6">
            Manage your expenses by category
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">
                No expenses recorded
              </p>
              <p className="text-gray-400 text-xs mt-2">
                Add your first expense from the home page
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => {
                const category = expense.categories;
                const categoryColor = category?.color || "#A1A1A1";
                const categoryName = category?.name || "Other";

                return (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Indicateur de catégorie */}
                      <div
                        className="h-10 w-1 rounded-full flex-shrink-0"
                        style={{ backgroundColor: categoryColor }}
                      />

                      {/* Informations */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="h-2 w-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: categoryColor }}
                          />
                          <span className="text-xs font-medium text-gray-500 truncate">
                            {categoryName}
                          </span>
                        </div>
                        {editingId === expense.id ? (
                          <>
                            <input
                              type="text"
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              className="w-full text-sm font-medium text-gray-900 px-2 py-1 border border-gray-300 rounded focus:border-flow-primary focus:outline-none focus:ring-1 focus:ring-flow-primary mb-1"
                              placeholder="Label"
                              autoFocus
                            />
                            <input
                              type="number"
                              step="0.01"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="w-full text-xs text-gray-900 px-2 py-1 border border-gray-300 rounded focus:border-flow-primary focus:outline-none focus:ring-1 focus:ring-flow-primary"
                              placeholder="Amount"
                            />
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {expense.label}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(expense.expense_date)}
                            </p>
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {editingId === expense.id ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveEdit(expense.id, expense.currency);
                              }}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Save"
                            >
                              <CheckIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelEdit();
                              }}
                              className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
                              title="Cancel"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-base font-semibold text-flow-primary">
                              {formatCurrency(
                                Number(expense.amount),
                                expense.currency
                              )}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(expense);
                              }}
                              disabled={deletingId === expense.id || editingId !== null}
                              className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Edit"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(expense.id);
                              }}
                              disabled={deletingId === expense.id || editingId !== null}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
    </>
  );
}

