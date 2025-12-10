"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { getUserSettings, updateUserSettings } from "@/lib/supabase/settings";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const currencies = [
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "GBP", symbol: "£", name: "British Pound" },
];

export default function ParametersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [salaryNet, setSalaryNet] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState(currencies[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Charger les paramètres actuels
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const settings = await getUserSettings(user.id);
        if (settings) {
          setSalaryNet(settings.salary_net.toString());
          const currency = currencies.find(c => c.code === settings.currency) || currencies[0];
          setSelectedCurrency(currency);
        }
      } catch (err) {
        console.error("Error loading settings:", err);
        setError("Erreur lors du chargement des paramètres");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  // Rediriger vers /auth si l'utilisateur n'est pas connecté
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      if (!user) {
        setError("Vous devez être connecté");
        setSaving(false);
        return;
      }

      const parsedSalary = parseFloat(salaryNet);
      if (isNaN(parsedSalary) || parsedSalary < 0) {
        setError("Veuillez saisir un montant valide");
        setSaving(false);
        return;
      }

      await updateUserSettings(user.id, {
        salary_net: parsedSalary,
        currency: selectedCurrency.code,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error updating settings:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la sauvegarde. Veuillez réessayer."
      );
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 bg-flowBg">
        <div className="text-flowTextMuted">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirection en cours
  }

  return (
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
            Paramètres
          </h1>
          <p className="text-sm text-flowTextMuted mb-6">
            Gérez vos paramètres financiers
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              ✅ Paramètres sauvegardés avec succès
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Salaire net */}
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
              <p className="mt-1 text-xs text-gray-500">
                Montant net après impôts
              </p>
            </div>

            {/* Bouton de sauvegarde */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-flow-primary px-4 py-3 text-sm font-medium text-white hover:bg-flow-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Enregistrement..." : "Enregistrer les paramètres"}
              </button>
            </div>
          </form>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

