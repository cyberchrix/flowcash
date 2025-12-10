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
        className="rounded-[28px] bg-white border border-gray-200 px-6 py-5"
        style={{
          fontFamily:
            'Inter Variable, ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", Segoe UI Symbol, "Noto Color Emoji"',
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        }}
      >
        <h2 className="text-sm font-semibold text-flow-primary mb-4">
          Summary
        </h2>

        <div className="text-sm font-medium text-flowTextMuted">
          Net Income
        </div>

        <div className="mt-1 text-3xl font-semibold text-flow-primary">
          {Math.round(animatedSalaryNet).toLocaleString("fr-FR")} €
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-flowTextMuted">
              Total Expenses
            </div>
            <div className="mt-1 text-xl font-semibold text-flowPink">
              {animatedTotalExpenses.toLocaleString("fr-FR", {
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
            <div
              className={`mt-1 text-xl font-semibold ${
                remaining >= 0 ? "text-green-600" : "text-red-600"
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
      </section>
    </div>
  );
}

