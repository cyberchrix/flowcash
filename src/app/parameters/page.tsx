"use client";

import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";

export default function ParametersPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 bg-flowBg">
      <Header />

      <main className="flex-1 space-y-6 pt-20 pb-28">
        <div className="rounded-[28px] bg-white/90 px-6 py-5 backdrop-blur-xl">
          <h1 className="text-2xl font-semibold text-flow-primary">
            Parameters
          </h1>
          <p className="mt-2 text-sm text-flowTextMuted">
            Page de paramètres à venir...
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

