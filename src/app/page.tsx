"use client";

import { Header } from "@/components/Header";
import { SummaryCard } from "@/components/SummaryCard";
import { ChargesByCategoryCard } from "@/components/ChargesByCategoryCard";
import { BottomNav } from "@/components/BottomNav";
import { SplashScreen } from "@/components/SplashScreen";
import { AddExpenseModal } from "@/components/AddExpenseModal";
import { useNavigation } from "@/contexts/NavigationContext";
import { useModal } from "@/contexts/ModalContext";
import { Category } from "@/types";

const salaryNet = 4645;
const totalExpenses = 2008.51;
const remaining = salaryNet - totalExpenses;

const categories: Category[] = [
  { name: "Housing", percent: 45, color: "#FF2D8A" },
  { name: "Children", percent: 22, color: "#8A2BFF" },
  { name: "Subscriptions", percent: 18, color: "#316CFF" },
  { name: "Transport", percent: 10, color: "#FFC04A" },
  { name: "Other", percent: 5, color: "#A1A1A1" },
];

export default function Home() {
  const { showSplash } = useNavigation();
  const { isAddExpenseModalOpen, closeAddExpenseModal } = useModal();

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <>
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 bg-flowBg">
        <Header />

        <main className="flex-1 space-y-6 pt-20 pb-28">
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
      />
    </>
  );
}