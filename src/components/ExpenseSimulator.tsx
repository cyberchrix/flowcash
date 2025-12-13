"use client";

import { useState, useEffect, useRef } from "react";
import { Modal } from "./Modal";
import { Category } from "@/types";
import { CalculatorIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

interface SimulatedExpense {
  id: string;
  label: string;
  amount: number;
  categoryId: string | null;
  categoryName: string;
  categoryColor: string;
}

interface ExpenseSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  netIncome: number;
  currentTotalExpenses: number;
  currency: string;
}

export function ExpenseSimulator({
  isOpen,
  onClose,
  categories,
  netIncome,
  currentTotalExpenses,
  currency,
}: ExpenseSimulatorProps) {
  const [simulatedExpenses, setSimulatedExpenses] = useState<SimulatedExpense[]>([]);
  const [newExpenseAmount, setNewExpenseAmount] = useState("");
  const [newExpenseCategoryId, setNewExpenseCategoryId] = useState<string | null>(
    categories[0]?.id || null
  );
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Calculate totals with simulated expenses
  const simulatedTotal = simulatedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalExpenses = currentTotalExpenses + simulatedTotal;
  const remaining = netIncome - totalExpenses;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleAddSimulatedExpense = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!newExpenseAmount.trim()) {
      return;
    }

    const parsedAmount = parseFloat(newExpenseAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    const selectedCategory = categories.find((cat) => cat.id === newExpenseCategoryId);
    const categoryName = selectedCategory?.name || "Other";
    const categoryColor = selectedCategory?.color || "#A1A1A1";

    const newExpense: SimulatedExpense = {
      id: Math.random().toString(36).substring(2, 9),
      label: categoryName, // Utiliser le nom de la catégorie comme label par défaut
      amount: parsedAmount,
      categoryId: newExpenseCategoryId,
      categoryName,
      categoryColor,
    };

    setSimulatedExpenses([...simulatedExpenses, newExpense]);
    setNewExpenseAmount("");
    // Garder la même catégorie pour ajouter rapidement plusieurs dépenses
    // setNewExpenseCategoryId(categories[0]?.id || null);
    // Réinitialiser le focus sur l'input
    setTimeout(() => amountInputRef.current?.focus(), 0);
  };

  const handleRemoveSimulatedExpense = (id: string) => {
    setSimulatedExpenses(simulatedExpenses.filter((exp) => exp.id !== id));
  };

  const handleClearAll = () => {
    setSimulatedExpenses([]);
  };

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSimulatedExpenses([]);
      setNewExpenseAmount("");
    } else {
      // Focus sur l'input quand le modal s'ouvre
      setTimeout(() => amountInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Expense Simulator">
      <div className="space-y-6">
        {/* Current Status */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                Net Income:
              </span>
              <span className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                {formatCurrency(netIncome)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                Current Expenses:
              </span>
              <span className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                {formatCurrency(currentTotalExpenses)}
              </span>
            </div>
            {simulatedExpenses.length > 0 && (
              <div className="flex justify-between items-center pt-2 border-t border-blue-300 dark:border-blue-700">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  Simulated Expenses:
                </span>
                <span className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                  +{formatCurrency(simulatedTotal)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t-2 border-blue-400 dark:border-blue-600">
              <span className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                Projected Disposable Income:
              </span>
              <span
                className={`text-lg font-bold ${
                  remaining >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {formatCurrency(remaining)}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Add Form */}
        <form onSubmit={handleAddSimulatedExpense} className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                ref={amountInputRef}
                type="number"
                step="0.01"
                value={newExpenseAmount}
                onChange={(e) => setNewExpenseAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newExpenseAmount.trim()) {
                    handleAddSimulatedExpense();
                  }
                }}
                placeholder="Amount"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2.5 text-base focus:border-flow-primary focus:outline-none focus:ring-2 focus:ring-flow-primary/20"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!newExpenseAmount.trim()}
              className="rounded-lg bg-flow-primary px-4 py-2.5 text-white hover:bg-flow-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              title="Add expense"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Quick category selection */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setNewExpenseCategoryId(category.id || null)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  newExpenseCategoryId === category.id
                    ? "bg-opacity-100 shadow-sm"
                    : "bg-opacity-40 opacity-70 hover:opacity-90"
                }`}
                style={{
                  backgroundColor: newExpenseCategoryId === category.id ? category.color : `${category.color}40`,
                  color: newExpenseCategoryId === category.id ? "#FFFFFF" : category.color,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: newExpenseCategoryId === category.id ? "#FFFFFF" : category.color }}
                />
                {category.name}
              </button>
            ))}
          </div>
        </form>

        {/* Simulated Expenses List */}
        {simulatedExpenses.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Simulated Expenses ({simulatedExpenses.length})
              </h3>
              <button
                onClick={handleClearAll}
                className="text-xs text-red-600 dark:text-red-400 hover:underline"
              >
                Clear All
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {simulatedExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: expense.categoryColor }}
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {expense.categoryName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(expense.amount)}
                    </span>
                    <button
                      onClick={() => handleRemoveSimulatedExpense(expense.id)}
                      className="p-1 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Remove"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close Button */}
        <div className="pt-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

