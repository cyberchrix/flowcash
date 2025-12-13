"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Force dynamic rendering to avoid build-time errors with Supabase
export const dynamic = 'force-dynamic';
import { Header } from "@/components/Header";
import { CalculatorIcon } from "@heroicons/react/24/outline";
import { SummaryCard } from "@/components/SummaryCard";
import { ChargesByCategoryCard } from "@/components/ChargesByCategoryCard";
import { BottomNav } from "@/components/BottomNav";
import { SplashScreen } from "@/components/SplashScreen";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SalaryOnboardingModal } from "@/components/SalaryOnboardingModal";
import { ExpenseSimulator } from "@/components/ExpenseSimulator";
import { useNavigation } from "@/contexts/NavigationContext";
import { useAuth } from "@/hooks/useAuth";
import { getCategories } from "@/lib/supabase/categories";
import { getExpensesByCategory } from "@/lib/supabase/expenses";
import { getUserSettings, updateUserSettings } from "@/lib/supabase/settings";
import { Category } from "@/types";
import { useToast } from "@/contexts/ToastContext";

export default function Home() {
  const { showSplash } = useNavigation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [salaryNet, setSalaryNet] = useState(0);
  const [taxWithholdingRate, setTaxWithholdingRate] = useState<number | null>(null);
  const [netIncome, setNetIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [currency, setCurrency] = useState("EUR");
  const [loading, setLoading] = useState(true);
  const [showSalaryOnboarding, setShowSalaryOnboarding] = useState(false);
  const [showExpenseSimulator, setShowExpenseSimulator] = useState(false);
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
        const taxRate = settings.tax_withholding_rate ? Number(settings.tax_withholding_rate) : null;
        
        setSalaryNet(salary);
        setTaxWithholdingRate(taxRate);
        
        // Calculate Net Income: salary_net * (1 - tax_rate / 100)
        const calculatedNetIncome = taxRate 
          ? salary * (1 - taxRate / 100)
          : salary;
        setNetIncome(calculatedNetIncome);
        
        setCurrency(settings.currency || "EUR");
        
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


  const handleSalaryOnboardingComplete = (newSalaryNet: number) => {
    setSalaryNet(newSalaryNet);
    // Calculate Net Income with current tax rate (if any)
    const calculatedNetIncome = taxWithholdingRate 
      ? newSalaryNet * (1 - taxWithholdingRate / 100)
      : newSalaryNet;
    setNetIncome(calculatedNetIncome);
    setShowSalaryOnboarding(false);
    // Recharger les données pour s'assurer que tout est à jour
    loadData();
  };

  // Recalculate Net Income when salary or tax rate changes
  useEffect(() => {
    const calculatedNetIncome = taxWithholdingRate 
      ? salaryNet * (1 - taxWithholdingRate / 100)
      : salaryNet;
    setNetIncome(calculatedNetIncome);
  }, [salaryNet, taxWithholdingRate]);

  const handleSalaryUpdate = async (newSalary: number) => {
    if (!user) return;
    try {
      await updateUserSettings(user.id, { salary_net: newSalary });
      setSalaryNet(newSalary);
      
      // Recalculate Net Income with current tax rate
      const calculatedNetIncome = taxWithholdingRate 
        ? newSalary * (1 - taxWithholdingRate / 100)
        : newSalary;
      setNetIncome(calculatedNetIncome);
      
      showSuccess(`Net income updated to ${calculatedNetIncome.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`);
    } catch (err) {
      console.error("Error updating salary:", err);
      showError(
        err instanceof Error
          ? err.message
          : "Error updating net income"
      );
    }
  };

  // Afficher le loading pendant la vérification de l'auth
  if (authLoading) {
    return <LoadingScreen />;
  }

  // Rediriger si pas connecté (la redirection se fait dans useEffect)
  if (!user) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 bg-flowBg dark:bg-transparent">
        <div className="text-flowTextMuted dark:text-gray-400">Redirecting...</div>
      </div>
    );
  }

  if (showSplash) {
    return <SplashScreen />;
  }

  if (loading) {
    return <LoadingScreen />;
  }

  const remaining = netIncome - totalExpenses;

  // Fonction pour obtenir le nom de l'utilisateur
  const getUserName = () => {
    if (!user) return "User";
    
    // Chercher dans user_metadata
    const name = user.user_metadata?.full_name || 
                 user.user_metadata?.name || 
                 user.user_metadata?.display_name;
    
    if (name) return name;
    
    // Sinon, extraire le prénom de l'email
    if (user.email) {
      const emailName = user.email.split("@")[0];
      // Capitaliser la première lettre
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    
    return "User";
  };

  return (
    <>
      <div id="page-top-anchor" className="absolute top-0 left-0 w-1 h-1 opacity-0 pointer-events-none" aria-hidden="true" />
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 bg-flowBg dark:bg-transparent" data-scroll-container>
        <Header />

        <main className="flex-1 space-y-2 pt-20 pb-28">
          {/* Message de bienvenue */}
          {/* <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Hello,<br />
              {getUserName()} 👋
            </h1>
          </div> */}
                  <SummaryCard
                    salaryNet={netIncome}
                    totalExpenses={totalExpenses}
                    remaining={remaining}
                    onSalaryUpdate={handleSalaryUpdate}
                  />

          <ChargesByCategoryCard categories={categories} totalExpenses={totalExpenses} currency={currency} />

          {/* Expense Simulator Card */}
          <div
            className="rounded-[28px] bg-white dark:bg-white/2 border border-gray-200 dark:border-transparent px-6 py-5 cursor-pointer hover:shadow-md transition-shadow"
            style={{
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            }}
            onClick={() => setShowExpenseSimulator(true)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/20">
                  <CalculatorIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white/50 uppercase">
                    Expense Simulator
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Simulate expenses to see their impact
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        <BottomNav />
      </div>

      <SalaryOnboardingModal
        isOpen={showSalaryOnboarding}
        onComplete={handleSalaryOnboardingComplete}
      />

      <ExpenseSimulator
        isOpen={showExpenseSimulator}
        onClose={() => setShowExpenseSimulator(false)}
        categories={categories}
        netIncome={netIncome}
        currentTotalExpenses={totalExpenses}
        currency={currency}
      />
    </>
  );
}