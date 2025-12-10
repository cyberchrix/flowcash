"use client";

import { useEffect, useState } from "react";
import { Category } from "@/types";

interface ChargesByCategoryCardProps {
  categories: Category[];
}

export function ChargesByCategoryCard({
  categories,
}: ChargesByCategoryCardProps) {
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

