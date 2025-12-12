"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { getExpenses, deleteExpense, updateExpense } from "@/lib/supabase/expenses";
import { getCategories } from "@/lib/supabase/categories";
import { Category } from "@/types";
import { TrashIcon, PencilIcon, CheckIcon, XMarkIcon, ArrowDownIcon, ArrowUpIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { Database } from "@/types/database";
import { useToast } from "@/contexts/ToastContext";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

type Expense = Database["public"]["Tables"]["expenses"]["Row"] & {
  categories: { name: string; color: string } | null;
};

export default function ExpensesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [groupByCategory, setGroupByCategory] = useState(true);

  const loadExpenses = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const [expensesData, categoriesData] = await Promise.all([
        getExpenses(user.id),
        getCategories(user.id),
      ]);
      setExpenses(expensesData as Expense[]);
      setCategories(
        categoriesData.map((cat) => ({
          id: cat.id,
          name: cat.name,
          color: cat.color,
          percent: 0,
        }))
      );
      setError(null);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Error loading data");
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
    setEditCategoryId(expense.category_id || null);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditLabel("");
    setEditAmount("");
    setEditCategoryId(null);
    setError(null);
    
    // Restaurer le zoom sur iOS après l'annulation
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
          setTimeout(() => {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
          }, 100);
        }
        window.scrollTo(0, window.scrollY);
      }, 100);
    }
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
        category_id: editCategoryId,
      });
      await loadExpenses();
      setEditingId(null);
      setEditLabel("");
      setEditAmount("");
      setEditCategoryId(null);
      showSuccess(`Expense "${editLabel.trim()}" updated successfully`);
      
      // Restaurer le zoom sur iOS après la validation
      if (typeof window !== 'undefined') {
        // Attendre un peu pour que le DOM se mette à jour
        setTimeout(() => {
          // Forcer le zoom à 1 et restaurer la position de scroll
          const viewport = document.querySelector('meta[name="viewport"]');
          if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
            setTimeout(() => {
              viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
            }, 100);
          }
          // Restaurer la position de scroll
          window.scrollTo(0, window.scrollY);
        }, 100);
      }
    } catch (err) {
      console.error("Error updating expense:", err);
      const errorMessage = err instanceof Error
        ? err.message
        : "Error updating expense";
      setError(errorMessage);
      showError(errorMessage);
    }
  };

  const handleToggleActive = async (expenseId: string, currentActive: boolean) => {
    const expense = expenses.find((e) => e.id === expenseId);
    const expenseLabel = expense?.label || "expense";
    
    setError(null);
    try {
      await updateExpense(expenseId, {
        active: !currentActive,
      });
      await loadExpenses();
      showSuccess(
        `Expense "${expenseLabel}" ${!currentActive ? "enabled" : "disabled"} successfully`
      );
    } catch (err) {
      console.error("Error toggling expense:", err);
      const errorMessage = err instanceof Error
        ? err.message
        : "Error toggling expense";
      setError(errorMessage);
      showError(errorMessage);
    }
  };

  const handleDelete = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) {
      return;
    }

    const expense = expenses.find((e) => e.id === expenseId);
    const expenseLabel = expense?.label || "expense";

    setDeletingId(expenseId);
    setError(null);

    try {
      await deleteExpense(expenseId);
      // Recharger la liste
      await loadExpenses();
      showSuccess(`Expense "${expenseLabel}" deleted successfully`);
    } catch (err) {
      console.error("Error deleting expense:", err);
      const errorMessage = err instanceof Error
        ? err.message
        : "Error deleting expense";
      setError(errorMessage);
      showError(errorMessage);
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
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 bg-flowBg dark:bg-transparent">
      <Header />

      <main className="flex-1 space-y-6 pt-20 pb-28">
        <div
          className="rounded-[28px] bg-white dark:bg-white/2 border border-gray-200 dark:border-transparent px-6 py-5"
          style={{
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          }}
        >
          <h1 className="text-xs font-semibold text-gray-900 dark:text-white/50 uppercase mb-2">
            My Expenses
          </h1>
          <p className="text-sm text-flowTextMuted dark:text-gray-400 mb-6">
            Manage your expenses by category
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {expenses.length > 0 && (
            <div className="mb-4 flex items-center gap-3">
              <button
                onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                title={sortOrder === "desc" ? "Sort ascending" : "Sort descending"}
              >
                {sortOrder === "desc" ? (
                  <ArrowDownIcon className="h-4 w-4" />
                ) : (
                  <ArrowUpIcon className="h-4 w-4" />
                )}
                {sortOrder === "desc" ? "Desc" : "Asc"}
              </button>
              <button
                onClick={() => setGroupByCategory(!groupByCategory)}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  groupByCategory
                    ? "bg-flow-primary text-white hover:bg-flow-primary/90"
                    : "text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {groupByCategory ? "By Category" : "All"}
              </button>
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
            (() => {
              // Trier les dépenses (actives d'abord, puis désactivées)
              const sortedExpenses = [...expenses].sort((a, b) => {
                const aActive = a.active !== false;
                const bActive = b.active !== false;
                // Trier par statut actif d'abord (actives en premier)
                if (aActive !== bActive) {
                  return aActive ? -1 : 1;
                }
                // Puis par montant
                const amountA = Number(a.amount);
                const amountB = Number(b.amount);
                return sortOrder === "desc" ? amountB - amountA : amountA - amountB;
              });

              // Grouper par catégorie si demandé
              if (groupByCategory) {
                const grouped = sortedExpenses.reduce((acc, expense) => {
                  const categoryName = expense.categories?.name || "Other";
                  if (!acc[categoryName]) {
                    acc[categoryName] = [];
                  }
                  acc[categoryName].push(expense);
                  return acc;
                }, {} as Record<string, Expense[]>);

                // Trier les catégories par montant total (selon sortOrder) - seulement les dépenses actives
                const sortedCategories = Object.entries(grouped).sort((a, b) => {
                  const totalA = a[1].reduce((sum, exp) => {
                    const isActive = exp.active !== false;
                    return isActive ? sum + Number(exp.amount) : sum;
                  }, 0);
                  const totalB = b[1].reduce((sum, exp) => {
                    const isActive = exp.active !== false;
                    return isActive ? sum + Number(exp.amount) : sum;
                  }, 0);
                  return sortOrder === "desc" ? totalB - totalA : totalA - totalB;
                });

                return (
                  <div className="space-y-6">
                    {sortedCategories.map(([categoryName, categoryExpenses]) => {
                      const categoryColor = categoryExpenses[0]?.categories?.color || "#A1A1A1";
                      // Ne compter que les dépenses actives dans le total
                      const totalAmount = categoryExpenses.reduce(
                        (sum, exp) => {
                          const isActive = exp.active !== false;
                          return isActive ? sum + Number(exp.amount) : sum;
                        },
                        0
                      );
                      const currency = categoryExpenses[0]?.currency || "EUR";

                      return (
                        <div key={categoryName} className="space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: categoryColor }}
                              />
                              <span className="text-xs font-semibold text-gray-900 dark:text-white/50 uppercase">
                                {categoryName}
                              </span>
                            </div>
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              {formatCurrency(totalAmount, currency)}
                            </span>
                          </div>
                          {categoryExpenses.map((expense) => renderExpenseItem(expense))}
                        </div>
                      );
                    })}
                  </div>
                );
              }

              // Sinon afficher toutes les dépenses triées
              return (
                <div className="space-y-3">
                  {sortedExpenses.map((expense) => renderExpenseItem(expense))}
                </div>
              );
            })()
          )}
        </div>
      </main>

      <BottomNav />
    </div>
    </>
  );

  function renderExpenseItem(expense: Expense) {
    const category = expense.categories;
    const categoryColor = category?.color || "#A1A1A1";
    const categoryName = category?.name || "Other";
    const isActive = expense.active !== false; // Par défaut true si undefined

    return (
      <div
        key={expense.id}
        className={`flex items-center justify-between p-4 rounded-lg bg-white dark:bg-white/2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
          !isActive ? "opacity-50" : ""
        }`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Indicateur de catégorie */}
          <div
            className="h-10 w-1 rounded-full flex-shrink-0"
            style={{ backgroundColor: categoryColor }}
          />

          {/* Informations */}
          <div className="flex-1 min-w-0">
            {!groupByCategory && (
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: categoryColor }}
                />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-400 truncate">
                  {categoryName}
                </span>
              </div>
            )}
            {editingId === expense.id ? (
              <>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full text-base font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:border-flow-primary focus:outline-none focus:ring-1 focus:ring-flow-primary mb-1"
                  placeholder="Label"
                  autoFocus
                  style={{ fontSize: '16px' }}
                />
                <select
                  value={editCategoryId || ""}
                  onChange={(e) => setEditCategoryId(e.target.value || null)}
                  className="w-full text-base text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:border-flow-primary focus:outline-none focus:ring-1 focus:ring-flow-primary mb-1"
                  style={{ fontSize: '16px' }}
                >
                  <option value="">No category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full text-base text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:border-flow-primary focus:outline-none focus:ring-1 focus:ring-flow-primary"
                  placeholder="Amount"
                  style={{ fontSize: '16px' }}
                />
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {expense.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
                  className="p-2 text-green-600 dark:text-white hover:bg-green-50 dark:hover:bg-white/10 rounded-lg transition-colors"
                  title="Save"
                >
                  <CheckIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelEdit();
                  }}
                  className="p-2 text-gray-500 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 rounded-lg transition-colors"
                  title="Cancel"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                <span className={`text-base font-semibold ${isActive ? "text-flow-primary" : "text-gray-400 dark:text-gray-500"}`}>
                  {formatCurrency(
                    Number(expense.amount),
                    expense.currency
                  )}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleActive(expense.id, isActive);
                  }}
                  disabled={deletingId === expense.id || editingId !== null}
                  className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                    isActive
                      ? "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10"
                      : "text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                  }`}
                  title={isActive ? "Disable" : "Enable"}
                >
                  {isActive ? (
                    <EyeIcon className="h-5 w-5" />
                  ) : (
                    <EyeSlashIcon className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(expense);
                  }}
                  disabled={deletingId === expense.id || editingId !== null}
                  className="p-2 text-blue-500 dark:text-white hover:bg-blue-50 dark:hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
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
                  className="p-2 text-red-500 dark:text-white hover:bg-red-50 dark:hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
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
  }
}

