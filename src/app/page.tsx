"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Force dynamic rendering to avoid build-time errors with Supabase
export const dynamic = 'force-dynamic';
import { Header } from "@/components/Header";
import { SummaryCard } from "@/components/SummaryCard";
import { ChargesByCategoryCard } from "@/components/ChargesByCategoryCard";
import { BottomNav } from "@/components/BottomNav";
import { SplashScreen } from "@/components/SplashScreen";
import { AddExpenseModal } from "@/components/AddExpenseModal";
import { SalaryOnboardingModal } from "@/components/SalaryOnboardingModal";
import { useNavigation } from "@/contexts/NavigationContext";
import { useModal } from "@/contexts/ModalContext";
import { useAuth } from "@/hooks/useAuth";
import { getCategories } from "@/lib/supabase/categories";
import { getExpensesByCategory } from "@/lib/supabase/expenses";
import { getUserSettings } from "@/lib/supabase/settings";
import { Category } from "@/types";

export default function Home() {
  const { showSplash } = useNavigation();
  const { isAddExpenseModalOpen, closeAddExpenseModal } = useModal();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [salaryNet, setSalaryNet] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSalaryOnboarding, setShowSalaryOnboarding] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Load categories
      const categoriesData = await getCategories(user.id);
      setCategories(
        categoriesData.map((cat) => ({
          id: cat.id,
          name: cat.name,
          color: cat.color,
          percent: 0, // Will be calculated below
        }))
      );

      // Load expenses by category and calculate totals
      const expensesByCategory = await getExpensesByCategory(user.id);
      const totalExp = expensesByCategory.reduce(
        (sum, cat) => sum + cat.total,
        0
      );
      setTotalExpenses(totalExp);

      // Update categories with percentages from expenses
      setCategories((prev) =>
        prev.map((cat) => {
          const expenseCat = expensesByCategory.find(
            (e) => e.name === cat.name
          );
          return {
            ...cat,
            percent: expenseCat ? expenseCat.percent : 0,
          };
        })
      );

      // Load user settings
      const settings = await getUserSettings(user.id);
      if (settings) {
        const salary = Number(settings.salary_net) || 0;
        setSalaryNet(salary);
        
        // Afficher l'onboarding si le salaire n'est pas configuré
        if (!settingsLoaded && salary === 0) {
          setShowSalaryOnboarding(true);
        }
        setSettingsLoaded(true);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    // Rediriger vers /auth si l'utilisateur n'est pas connecté
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [user, authLoading, router]);

  const handleExpenseAdded = () => {
    loadData();
  };

  const handleSalaryOnboardingComplete = (newSalaryNet: number) => {
    setSalaryNet(newSalaryNet);
    setShowSalaryOnboarding(false);
    // Recharger les données pour s'assurer que tout est à jour
    loadData();
  };

  // Afficher le loading pendant la vérification de l'auth ou si pas connecté
  if (authLoading || !user) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 bg-flowBg">
        <div className="text-flowTextMuted">Loading...</div>
      </div>
    );
  }

  if (showSplash) {
    return <SplashScreen />;
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 bg-flowBg">
        <div className="text-flowTextMuted">Chargement des données...</div>
      </div>
    );
  }

  const remaining = salaryNet - totalExpenses;

  return (
    <>
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 bg-flowBg">
        <Header />

        <main className="flex-1 space-y-6 pt-14 pb-28">
          <SummaryCard
            salaryNet={salaryNet}
            totalExpenses={totalExpenses}
            remaining={remaining}
          />

          <ChargesByCategoryCard categories={categories} />
        </main>

        <BottomNav />
      </div>

      <AddExpenseModal
        isOpen={isAddExpenseModalOpen}
        onClose={closeAddExpenseModal}
        categories={categories}
        onExpenseAdded={handleExpenseAdded}
      />

      <SalaryOnboardingModal
        isOpen={showSalaryOnboarding}
        onComplete={handleSalaryOnboardingComplete}
      />
    </>
  );
}