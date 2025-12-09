"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { HomeIcon, ChartBarIcon, PlusIcon } from "@heroicons/react/24/outline";

type Category = {
  name: string;
  percent: number;
  color: string;
};

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
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500); // Affiche le splash pendant 2.5 secondes

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-flowBg">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Image
            src="/availo-icon_v6.png"
            alt="Availo Icon"
            width={80}
            height={80}
            priority
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 bg-flowBg">
      <Header />

      <main className="flex-1 space-y-6 pt-26 pb-28">
        <SummaryCard
          salaryNet={salaryNet}
          totalExpenses={totalExpenses}
          remaining={remaining}
        />

        <ChargesByCategoryCard categories={categories} />
      </main>

      <BottomNav />
    </div>
  );
}

/* ---------------- HEADER ---------------- */

function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-2 backdrop-blur-md border-b border-white/10 pt-3">
      {/* FlowCash icon centered */}
      <Image
        src="/availo-icon_v6.png"
        alt="Availo Icon"
        width={40}
        height={40}
        priority
      />

      {/* CH avatar on the right, smaller */}
      <div className="absolute right-4 flex h-8 w-8 items-center justify-center rounded-full bg-flow-primary shadow-flowSoft">
        <span className="text-[10px] font-semibold text-white">CH</span>
      </div>
    </header>
  );
}

/* ---------------- SUMMARY CARD ---------------- */

function SummaryCard({
  salaryNet,
  totalExpenses,
  remaining,
}: {
  salaryNet: number;
  totalExpenses: number;
  remaining: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <div className="relative rounded-[28px] p-[1px] bg-[conic-gradient(from_140deg,rgba(255,45,138,0.2),rgba(138,43,255,0.6),rgba(49,108,255,0.2),rgba(255,45,138,0.2))] shadow-flowSoft">
        <section className="rounded-[26px] bg-white/90 px-6 py-5 backdrop-blur-xl">
          <div className="text-sm font-medium text-flowTextMuted">
            Net Income
          </div>

          <div className="mt-1 text-3xl font-semibold text-flow-primary">
            {salaryNet.toLocaleString("fr-FR")} €
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-flowTextMuted">
                Total Expenses
              </div>
              <div className="mt-1 text-xl font-semibold text-flowPink">
                {totalExpenses.toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                €
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-flowTextMuted">
                Disposable Income
              </div>
              <div className="mt-1 text-xl font-semibold text-flowBlue">
                {remaining.toLocaleString("fr-FR", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}{" "}
                €
              </div>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}

/* ---------------- DONUT + CATEGORIES ---------------- */

function ChargesByCategoryCard({ categories }: { categories: Category[] }) {
  // progress: 0 → 1 to animate donut + percentages
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frameId: number;
    const duration = 1000; // 1 second
    let start: number | null = null;

    const animate = (timestamp: number) => {
      if (start === null) start = timestamp;
      const elapsed = timestamp - start;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);
      if (p < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <section
      className="rounded-4xl border border-white/60 bg-white/80 p-6 shadow-flowSoft backdrop-blur-flow"
      style={{
        background:
          "radial-gradient(circle at bottom right, rgba(225,232,255,0.9), rgba(255,255,255,0.7))",
      }}
    >
      <h2 className="text-base font-semibold text-flowText">
        Expenses by Category
      </h2>

      <div className="mt-4 flex items-center justify-between gap-4">
        {/* Animated donut */}
        <div className="relative h-36 w-36">
          <svg
            viewBox="0 0 120 120"
            className="absolute inset-0 h-full w-full -rotate-90"
          >
            <defs>
              <linearGradient
                id="flowDonutGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#FF2D8A" />
                <stop offset="50%" stopColor="#8A2BFF" />
                <stop offset="100%" stopColor="#316CFF" />
              </linearGradient>
            </defs>

            {/* background circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="#E4E4E7"
              strokeWidth="12"
              fill="none"
              opacity={0.25}
            />

            {/* animated circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="url(#flowDonutGradient)"
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: offset,
              }}
            />
          </svg>

          {/* center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-xs">
            <span className="text-flowTextMuted">Total</span>
            <span className="text-lg font-semibold text-flowText">
              100%
            </span>
          </div>
        </div>

        {/* Categories with animated percentages */}
        <div className="flex-1 space-y-3 text-sm">
          {categories.map((cat) => {
            const displayed = Math.round(cat.percent * progress);
            return (
              <div
                key={cat.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-flowText">{cat.name}</span>
                </div>
                <span className="font-semibold text-flowText">
                  {displayed}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- BOTTOM NAV ---------------- */

function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4">
      <div className="flex w-full max-w-xs items-center justify-between rounded-3xl border border-white/60 bg-white/80 px-8 py-4 shadow-flowNav backdrop-blur-flow">
        <NavItem
          icon={<HomeIcon className="h-6 w-6" />}
          label="Home"
          active={true}
        />

        <button className="flex h-12 w-12 items-center justify-center rounded-full bg-flow-primary text-white shadow-flowSoft">
          <PlusIcon className="h-6 w-6 text-white" />
        </button>

        <NavItem
          icon={<ChartBarIcon className="h-6 w-6" />}
          label="Stats"
          active={false}
        />
      </div>
    </nav>
  );
}

function NavItem({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <button className="flex flex-col items-center gap-1 text-xs">
      <span className={active ? "text-flowBlue" : "text-flowTextMuted"}>
        {icon}
      </span>
      <span
        className={
          active
            ? "font-semibold text-flowBlue"
            : "font-medium text-flowTextMuted"
        }
      >
        {label}
      </span>
    </button>
  );
}