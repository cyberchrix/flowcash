"use client";

import { useEffect, useState } from "react";
import { Category } from "@/types";

interface ChargesByCategoryCardProps {
  categories: Category[];
}

// Fonction pour créer un arc SVG
function createArc(
  startAngle: number,
  endAngle: number,
  radius: number,
  centerX: number,
  centerY: number
): string {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M",
    centerX,
    centerY,
    "L",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
    "Z",
  ].join(" ");
}

// Fonction pour convertir les coordonnées polaires en coordonnées cartésiennes
function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

export function ChargesByCategoryCard({
  categories,
}: ChargesByCategoryCardProps) {
  // progress: 0 → 1 to animate donut + percentages
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frameId: number;
    const duration = 500; // 0.5 second - animation plus rapide
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

  const centerX = 60;
  const centerY = 60;
  const outerRadius = 50;
  const innerRadius = 35;

  // Calculer les angles pour chaque catégorie
  let currentAngle = 0;
  const segments = categories.map((cat) => {
    const angle = (cat.percent / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    return {
      ...cat,
      startAngle,
      endAngle,
    };
  });

  // Calculer le pourcentage total affiché
  const totalPercent = categories.reduce(
    (sum, cat) => sum + cat.percent,
    0
  );

  return (
    <section
      className="rounded-[28px] bg-white border border-gray-200 p-6"
      style={{
        fontFamily:
          'Inter Variable, ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", Segoe UI Symbol, "Noto Color Emoji"',
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      }}
    >
      <h2 className="text-sm font-semibold text-flow-primary">
        Expenses by Category
      </h2>

      <div className="mt-4 flex items-center justify-between gap-4">
        {/* Animated donut avec segments */}
        <div className="relative h-36 w-36 flex-shrink-0">
          <svg
            viewBox="0 0 120 120"
            className="absolute inset-0 h-full w-full -rotate-90"
          >
            {/* Cercle de fond */}
            <circle
              cx={centerX}
              cy={centerY}
              r={outerRadius}
              fill="#E4E4E7"
              opacity={0.15}
            />

            {/* Segments du camembert */}
            {segments.map((segment) => {
              const animatedEndAngle =
                segment.startAngle +
                (segment.endAngle - segment.startAngle) * progress;

              const angleDiff = animatedEndAngle - segment.startAngle;
              if (angleDiff <= 0) return null;

              // Points pour l'arc extérieur
              const outerStart = polarToCartesian(
                centerX,
                centerY,
                outerRadius,
                segment.startAngle
              );
              const outerEnd = polarToCartesian(
                centerX,
                centerY,
                outerRadius,
                animatedEndAngle
              );

              // Points pour l'arc intérieur
              const innerStart = polarToCartesian(
                centerX,
                centerY,
                innerRadius,
                animatedEndAngle
              );
              const innerEnd = polarToCartesian(
                centerX,
                centerY,
                innerRadius,
                segment.startAngle
              );

              const largeArcFlag = angleDiff > 180 ? "1" : "0";

              // Créer le chemin du segment de donut
              const pathData = [
                "M",
                outerStart.x,
                outerStart.y, // Commence au bord extérieur
                "A",
                outerRadius,
                outerRadius,
                0,
                largeArcFlag,
                1,
                outerEnd.x,
                outerEnd.y, // Arc extérieur
                "L",
                innerStart.x,
                innerStart.y, // Ligne vers le bord intérieur
                "A",
                innerRadius,
                innerRadius,
                0,
                largeArcFlag,
                0,
                innerEnd.x,
                innerEnd.y, // Arc intérieur (retour)
                "Z", // Fermer le chemin
              ].join(" ");

              return (
                <path
                  key={segment.name}
                  d={pathData}
                  fill={segment.color}
                  stroke="none"
                />
              );
            })}
          </svg>

          {/* center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-xs">
            <span className="text-flowTextMuted">Total</span>
            <span className="text-lg font-semibold text-flowText">
              {Math.round(totalPercent)}%
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

