"use client";

import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { Category } from "@/types";
import { createExpense } from "@/lib/supabase/expenses";
import { useAuth } from "@/hooks/useAuth";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onExpenseAdded?: () => void;
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
  onExpenseAdded,
}: AddExpenseModalProps) {
  const { user } = useAuth();
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState(currencies[0]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    categories[0] || null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mettre à jour la catégorie sélectionnée quand la liste change
  useEffect(() => {
    if (categories.length > 0 && (!selectedCategory || !categories.find(c => c.id === selectedCategory.id))) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!user) {
        setError("Vous devez être connecté pour ajouter une dépense");
        setIsSubmitting(false);
        return;
      }

      if (!selectedCategory || !selectedCategory.id) {
        setError("Veuillez sélectionner une catégorie");
        setIsSubmitting(false);
        return;
      }

      if (!label.trim()) {
        setError("Veuillez saisir un libellé");
        setIsSubmitting(false);
        return;
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setError("Veuillez saisir un montant valide");
        setIsSubmitting(false);
        return;
      }

      await createExpense({
        user_id: user.id,
        label: label.trim(),
        amount: parsedAmount,
        currency: selectedCurrency.code,
        category_id: selectedCategory.id,
        expense_date: new Date().toISOString().split("T")[0],
      });

      // Réinitialiser le formulaire et fermer
      setLabel("");
      setAmount("");
      setSelectedCategory(categories[0] || null);
      setError(null);
      onExpenseAdded?.();
      onClose();
    } catch (err) {
      console.error("Error adding expense:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de l'ajout de la dépense. Veuillez réessayer."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajouter une dépense">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {categories.length === 0 && (
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-700">
            ⚠️ Aucune catégorie disponible. Les catégories par défaut devraient être créées automatiquement à l'inscription.
          </div>
        )}

        {/* Libellé */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Libellé
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="ex: Courses alimentaires"
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-flow-primary focus:outline-none focus:ring-2 focus:ring-flow-primary/20"
          />
        </div>

        {/* Montant */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Montant
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
            Catégorie
          </label>
          <div className="grid grid-cols-2 gap-3">
            {categories.length === 0 ? (
              <div className="col-span-2 text-sm text-gray-500 text-center py-4">
                Aucune catégorie disponible. Veuillez créer des catégories dans les paramètres.
              </div>
            ) : (
              categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`flex items-center gap-2 rounded-lg border-2 px-4 py-3 transition-all ${
                    selectedCategory?.id === category.id
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
                      selectedCategory?.id === category.id
                        ? "text-flow-primary"
                        : "text-gray-700"
                    }`}
                  >
                    {category.name}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting || categories.length === 0}
            className="flex-1 rounded-lg bg-flow-primary px-4 py-2 text-sm font-medium text-white hover:bg-flow-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Ajout en cours..." : "Ajouter la dépense"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

