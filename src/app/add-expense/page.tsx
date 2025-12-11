"use client";

import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";

// Force dynamic rendering to avoid build-time errors
export const dynamic = 'force-dynamic';

export default function AddExpensePage() {
  return (
    <>
      <div id="page-top-anchor" className="absolute top-0 left-0 w-1 h-1 opacity-0 pointer-events-none" aria-hidden="true" />
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 bg-flowBg dark:bg-transparent">
      <Header />

      <main className="flex-1 space-y-6 pt-20 pb-28">
        <div className="rounded-[28px] bg-white/90 dark:bg-[#262A35]/90 px-6 py-5 backdrop-blur-xl">
          <h1 className="text-lg font-semibold text-flow-primary dark:text-white/50">
            Add Expense
          </h1>
          <p className="mt-2 text-sm text-flowTextMuted dark:text-gray-400">
            Expense form coming soon...
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
    </>
  );
}

