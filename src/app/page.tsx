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
import { LoadingScreen } from "@/components/LoadingScreen";
import { SalaryOnboardingModal } from "@/components/SalaryOnboardingModal";
import { useNavigation } from "@/contexts/NavigationContext";
import { useAuth } from "@/hooks/useAuth";
import { getCategories } from "@/lib/supabase/categories";
import { getExpensesByCategory } from "@/lib/supabase/expenses";
import { getUserSettings } from "@/lib/supabase/settings";
import { Category } from "@/types";

export default function Home() {
  const { showSplash } = useNavigation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [salaryNet, setSalaryNet] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [currency, setCurrency] = useState("EUR");
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
    setShowSalaryOnboarding(false);
    // Recharger les données pour s'assurer que tout est à jour
    loadData();
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

  const remaining = salaryNet - totalExpenses;

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
            salaryNet={salaryNet}
            totalExpenses={totalExpenses}
            remaining={remaining}
          />

          <ChargesByCategoryCard categories={categories} totalExpenses={totalExpenses} currency={currency} />
        </main>

        <BottomNav />
      </div>

      <SalaryOnboardingModal
        isOpen={showSalaryOnboarding}
        onComplete={handleSalaryOnboardingComplete}
      />
    </>
  );
}