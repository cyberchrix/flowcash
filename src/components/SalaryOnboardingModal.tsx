"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { updateUserSettings } from "@/lib/supabase/settings";
import { useAuth } from "@/hooks/useAuth";

interface SalaryOnboardingModalProps {
  isOpen: boolean;
  onComplete: (salaryNet: number) => void;
}

const currencies = [
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "GBP", symbol: "£", name: "British Pound" },
];

export function SalaryOnboardingModal({
  isOpen,
  onComplete,
}: SalaryOnboardingModalProps) {
  const { user } = useAuth();
  const [salaryNet, setSalaryNet] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState(currencies[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const parsedSalary = parseFloat(salaryNet);
      if (isNaN(parsedSalary) || parsedSalary <= 0) {
        setError("Veuillez saisir un montant valide");
        setIsSubmitting(false);
        return;
      }

      if (!user) {
        setError("Vous devez être connecté");
        setIsSubmitting(false);
        return;
      }

      await updateUserSettings(user.id, {
        salary_net: parsedSalary,
        currency: selectedCurrency.code,
      });

      onComplete(parsedSalary);
      setSalaryNet("");
      setError(null);
    } catch (err) {
      console.error("Error updating salary:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la sauvegarde. Veuillez réessayer."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Empêcher la fermeture du modal (onboarding obligatoire)
      title="Configuration initiale"
      disableClose={true} // Ajouter une prop pour désactiver la fermeture
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-sm text-gray-600 mb-4">
          Pour commencer, indiquez votre salaire net mensuel (ou vos rentrées d'argent mensuelles).
          Vous pourrez le modifier plus tard dans les paramètres.
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Montant */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Salaire net mensuel
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              value={salaryNet}
              onChange={(e) => setSalaryNet(e.target.value)}
              placeholder="0.00"
              required
              autoFocus
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

        {/* Bouton de validation */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting || !salaryNet.trim()}
            className="w-full rounded-lg bg-flow-primary px-4 py-3 text-sm font-medium text-white hover:bg-flow-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Enregistrement..." : "Continuer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

