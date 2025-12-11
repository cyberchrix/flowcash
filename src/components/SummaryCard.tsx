"use client";

import { useEffect, useState } from "react";

interface SummaryCardProps {
  salaryNet: number;
  totalExpenses: number;
  remaining: number;
}

// Hook pour animer un nombre
function useAnimatedNumber(value: number, duration: number = 800) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const startValue = 0;
    const endValue = value;

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (easeOutCubic)
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeOutCubic;

      setAnimatedValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setAnimatedValue(endValue);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return animatedValue;
}

export function SummaryCard({
  salaryNet,
  totalExpenses,
  remaining,
}: SummaryCardProps) {
  const animatedSalaryNet = useAnimatedNumber(salaryNet, 800);
  const animatedTotalExpenses = useAnimatedNumber(totalExpenses, 800);
  const animatedRemaining = useAnimatedNumber(remaining, 800);

  return (
    <div>
      <section
        className="rounded-[28px] px-6 py-5 relative overflow-hidden"
        style={{
          fontFamily:
            'Inter Variable, ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", Segoe UI Symbol, "Noto Color Emoji"',
          background: "linear-gradient(to right, #FF2D8A, #8A2BFF, #316CFF)",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
        }}
      >
        {/* Wave background */}
        <div className="absolute inset-0 opacity-20">
          <svg
            viewBox="0 0 1200 320"
            className="absolute bottom-0 left-0 w-full h-full"
            preserveAspectRatio="none"
            style={{ height: "100%", width: "100%" }}
          >
            <path
              d="M0,160L48,144C96,128,192,96,288,101.3C384,107,480,149,576,154.7C672,160,768,128,864,112C960,96,1056,96,1152,112C1248,128,1344,160,1392,176L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
              fill="white"
              opacity="0.3"
            />
            <path
              d="M0,192L48,181.3C96,171,192,149,288,154.7C384,160,480,192,576,186.7C672,181,768,139,864,122.7C960,107,1056,117,1152,133.3C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
              fill="white"
              opacity="0.2"
            />
          </svg>
        </div>
        <div className="relative z-10">
          <h2 className="text-sm font-semibold text-white mb-4">
            Summary
          </h2>

          <div className="text-sm font-medium text-white/90">
            Net Income
          </div>

          <div className="mt-1 text-3xl font-bold text-white">
            {Math.round(animatedSalaryNet).toLocaleString("fr-FR")} €
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-white/90">
                Total Expenses
              </div>
              <div className="mt-1 text-xl font-bold text-white">
                {animatedTotalExpenses.toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                €
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-white/90">
                Disposable Income
              </div>
              <div
                className={`mt-1 text-xl font-bold ${
                  remaining >= 0 ? "text-white" : "text-red-200"
                }`}
              >
                {Math.round(animatedRemaining).toLocaleString("fr-FR", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}{" "}
                €
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

