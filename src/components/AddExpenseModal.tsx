"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Category } from "@/types";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

const currencies = [
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "GBP", symbol: "£", name: "British Pound" },
];

export function AddExpenseModal({
  isOpen,
  onClose,
  categories,
}: AddExpenseModalProps) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState(currencies[0]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    categories[0] || null
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implémenter la logique de sauvegarde
    console.log({
      label,
      amount: parseFloat(amount),
      currency: selectedCurrency.code,
      category: selectedCategory,
    });
    // Réinitialiser le formulaire et fermer
    setLabel("");
    setAmount("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Expense">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Libellé */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Grocery shopping"
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-flow-primary focus:outline-none focus:ring-2 focus:ring-flow-primary/20"
          />
        </div>

        {/* Montant */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="flex-1 min-w-0 rounded-lg border border-gray-300 px-4 py-2 focus:border-flow-primary focus:outline-none focus:ring-2 focus:ring-flow-primary/20"
            />
            <select
              value={selectedCurrency.code}
              onChange={(e) => {
                const currency = currencies.find((c) => c.code === e.target.value);
                if (currency) setSelectedCurrency(currency);
              }}
              className="flex-shrink-0 rounded-lg border border-gray-300 px-4 py-2 focus:border-flow-primary focus:outline-none focus:ring-2 focus:ring-flow-primary/20"
            >
              {currencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.symbol} {currency.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Catégorie */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((category) => (
              <button
                key={category.name}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`flex items-center gap-2 rounded-lg border-2 px-4 py-3 transition-all ${
                  selectedCategory?.name === category.name
                    ? "border-flow-primary bg-flow-primary/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span
                  className={`text-sm font-medium ${
                    selectedCategory?.name === category.name
                      ? "text-flow-primary"
                      : "text-gray-700"
                  }`}
                >
                  {category.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 rounded-lg bg-flow-primary px-4 py-2 text-sm font-medium text-white hover:bg-flow-primary/90"
          >
            Add Expense
          </button>
        </div>
      </form>
    </Modal>
  );
}

