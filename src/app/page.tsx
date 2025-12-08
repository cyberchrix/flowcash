"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";


import {
  HomeIcon,
  ChartBarIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

type Category = {
  name: string;
  percent: number;
  color: string;
};

const salaryNet = 4645;
const totalExpenses = 2008.51;
const remaining = salaryNet - totalExpenses;

const categories: Category[] = [
  { name: "Logement", percent: 45, color: "#FF2D8A" },
  { name: "Enfants", percent: 22, color: "#8A2BFF" },
  { name: "Abonnements", percent: 18, color: "#316CFF" },
  { name: "Transport", percent: 10, color: "#FFC04A" },
  { name: "Autres", percent: 5, color: "#A1A1A1" },
];


export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pt-6 pb-4">
      <Header />

      <main className="mt-4 flex-1 space-y-6">
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

function Header() {
  return (
    <header
      className="
        fixed top-0 left-0 right-0 z-50
        relative flex items-center justify-center py-2
        backdrop-blur-md
        border-b border-white/10
      "
    >
      {/* Icône FlowCash centrée */}
      <Image
        src="/flowcash-icon.png"
        alt="FlowCash Icon"
        width={60}
        height={60}
        priority
      />

      {/* Avatar aligné à droite */}
      <div className="absolute right-4 flex h-9 w-9 items-center justify-center rounded-full bg-flow-primary shadow-flowSoft">
        <span className="text-sm font-semibold text-white">CH</span>
      </div>
    </header>
  );
}

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
    <motion.section
      className="rounded-4xl border border-white/60 bg-white/80 p-6 shadow-flowSoft backdrop-blur-flow"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(255,255,255,0.95), rgba(255,255,255,0.75))",
      }}

      /* ✨ Animation très discrète */
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}

      /* ✨ Hover minimaliste */
      whileHover={{
        scale: 1.01,
        boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
      }}

      whileTap={{ scale: 0.995 }}
    >
      <div className="text-sm font-medium text-flowTextMuted">Salaire net</div>
      <div className="mt-1 text-3xl font-semibold text-[#8A2BFF]">
        {salaryNet.toLocaleString("fr-FR")} €
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs text-flowTextMuted">Sorties totales</div>
          <div className="mt-1 text-xl font-semibold text-flowPink">
            {totalExpenses.toLocaleString("fr-FR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} €
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-flowTextMuted">Reste à vivre</div>
          <div className="mt-1 text-xl font-semibold text-flowBlue">
            {remaining.toLocaleString("fr-FR")} €
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function ChargesByCategoryCard({ categories }: { categories: Category[] }) {
  // progress : 0 → 1 avec une vraie anim
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frameId: number;
    const duration = 1000; // 1s
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
  const offset = circumference * (1 - progress); // pour le donut

  return (
    <section
      className="rounded-4xl border border-white/60 bg-white/80 p-6 shadow-flowSoft backdrop-blur-flow"
      style={{
        background:
          "radial-gradient(circle at bottom right, rgba(225,232,255,0.9), rgba(255,255,255,0.7))",
      }}
    >
      <h2 className="text-base font-semibold text-flowText">
        Sorties par catégorie
      </h2>

      <div className="mt-4 flex items-center justify-between gap-4">
        {/* Donut animé (gradient) */}
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

            {/* cercle de fond */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="#E4E4E7"
              strokeWidth="12"
              fill="none"
              opacity={0.25}
            />

            {/* cercle animé */}
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

          {/* Label centre */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-xs">
            <span className="text-flowTextMuted">Total</span>
            <span className="text-lg font-semibold text-flowText">100%</span>
          </div>
        </div>

        {/* Légende avec compteur animé */}
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

function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4">
      <div className="flex w-full max-w-xs items-center justify-between rounded-3xl border border-white/60 bg-white/80 px-8 py-4 shadow-flowNav backdrop-blur-flow">
        
        {/* Accueil actif */}
        <NavItem
          icon={<HomeIcon className="h-6 w-6" />}
          label="Accueil"
          active={true}
        />

        {/* bouton + plein */}
        <button className="flex h-12 w-12 items-center justify-center rounded-full bg-flow-primary text-white shadow-flowSoft">
          <PlusIcon className="h-6 w-6 text-white" />
        </button>

        {/* Stats inactive */}
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
      <span
        className={
          active ? "text-flow-primary" : "text-flow-muted"
        }
      >
        {icon}
      </span>
      <span
        className={
          active
            ? "font-semibold text-flow-primary"
            : "font-medium text-flow-muted"
        }
      >
        {label}
      </span>
    </button>
  );
}