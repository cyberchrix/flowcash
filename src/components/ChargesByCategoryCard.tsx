"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Category } from "@/types";

interface ChargesByCategoryCardProps {
  categories: Category[];
  totalExpenses: number;
  currency: string;
}

// Fonction pour obtenir le symbole de la devise
function getCurrencySymbol(currency: string): string {
  const symbols: { [key: string]: string } = {
    EUR: "€",
    USD: "$",
    GBP: "£",
  };
  return symbols[currency] || currency;
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
  totalExpenses,
  currency,
}: ChargesByCategoryCardProps) {
  const router = useRouter();
  // progress: 0 → 1 to animate donut + percentages
  const [progress, setProgress] = useState(0);
  const [hoveredSegment, setHoveredSegment] = useState<{
    category: Category;
    amount: number;
    percent: number;
    x: number;
    y: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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

  const centerX = 70;
  const centerY = 70;
  const outerRadius = 60;
  const innerRadius = 42;

  // Trier les catégories par pourcentage décroissant
  const sortedCategories = [...categories].sort((a, b) => b.percent - a.percent);

  // Calculer les angles pour chaque catégorie (triées)
  let currentAngle = 0;
  const segments = sortedCategories.map((cat) => {
    const angle = (cat.percent / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    // Calculer le montant pour cette catégorie
    const amount = (totalExpenses * cat.percent) / 100;

    return {
      ...cat,
      startAngle,
      endAngle,
      amount,
    };
  });

  // Handler pour le hover sur un segment
  const handleSegmentMouseEnter = (
    e: React.MouseEvent<SVGPathElement>,
    segment: typeof segments[0]
  ) => {
    e.stopPropagation();
    setHoveredSegment({
      category: segment,
      amount: segment.amount,
      percent: segment.percent,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleSegmentMouseLeave = (e: React.MouseEvent<SVGPathElement>) => {
    e.stopPropagation();
    setHoveredSegment(null);
  };

  const handleSegmentMouseMove = (
    e: React.MouseEvent<SVGPathElement>,
    segment: typeof segments[0]
  ) => {
    e.stopPropagation();
    setHoveredSegment({
      category: segment,
      amount: segment.amount,
      percent: segment.percent,
      x: e.clientX,
      y: e.clientY,
    });
  };

  // Calculer le pourcentage total affiché (pour la vérification)
  const totalPercent = sortedCategories.reduce(
    (sum, cat) => sum + cat.percent,
    0
  );

  // Animation du montant total
  const [animatedTotal, setAnimatedTotal] = useState(0);
  
  useEffect(() => {
    let frameId: number;
    const duration = 800;
    let start: number | null = null;
    const startValue = animatedTotal;
    const endValue = totalExpenses;
    const difference = endValue - startValue;

    const animate = (timestamp: number) => {
      if (start === null) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + difference * easeOut;
      
      setAnimatedTotal(current);
      
      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        setAnimatedTotal(endValue);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [totalExpenses]);

  return (
    <section
      onClick={() => router.push("/expenses")}
      className="rounded-[28px] relative cursor-pointer transition-colors"
      style={{
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      }}
    >
      <div
        className="rounded-[26px] bg-white dark:bg-white/2 border border-gray-200 dark:border-transparent p-6 h-full w-full hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        style={{
          fontFamily:
            '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "Courier New", monospace',
          letterSpacing: "0.5px",
        }}
      >
      <h2 className="text-xs font-semibold text-gray-900 dark:text-white/50 uppercase">
        Expenses by Category
      </h2>

      <div className="mt-4 flex items-center gap-4">
        {/* Animated donut avec segments */}
        <div className="relative h-44 w-44 flex-shrink-0">
          <svg
            ref={svgRef}
            viewBox="0 0 140 140"
            className="absolute inset-0 h-full w-full -rotate-90"
            style={{ pointerEvents: "all" }}
          >
            {/* Segments du camembert */}
            {segments.map((segment) => {
              const totalAngle = segment.endAngle - segment.startAngle;
              const animatedEndAngle =
                segment.startAngle + totalAngle * progress;

              const angleDiff = animatedEndAngle - segment.startAngle;
              
              // Si l'angle est très petit, ne pas afficher (mais permettre 360°)
              if (angleDiff < 0.1 && totalAngle < 359) return null;

              // Cas spécial : cercle complet (360° ou très proche)
              const isFullCircle = totalAngle >= 359.9;

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
                isFullCircle ? segment.startAngle + 359.9 : animatedEndAngle
              );

              // Points pour l'arc intérieur
              const innerStart = polarToCartesian(
                centerX,
                centerY,
                innerRadius,
                isFullCircle ? segment.startAngle + 359.9 : animatedEndAngle
              );
              const innerEnd = polarToCartesian(
                centerX,
                centerY,
                innerRadius,
                segment.startAngle
              );

              const effectiveAngle = isFullCircle ? 359.9 : angleDiff;
              const largeArcFlag = effectiveAngle > 180 ? "1" : "0";

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

              const isHovered = hoveredSegment?.category.id === segment.id;
              
              return (
                <path
                  key={`${segment.id}-${segment.name}`}
                  d={pathData}
                  fill={segment.color}
                  stroke="none"
                  onMouseEnter={(e) => handleSegmentMouseEnter(e, segment)}
                  onMouseLeave={handleSegmentMouseLeave}
                  onMouseMove={(e) => handleSegmentMouseMove(e, segment)}
                  className="cursor-pointer transition-opacity"
                  style={{ 
                    pointerEvents: "all",
                    opacity: isHovered ? 0.8 : 1,
                  }}
                />
              );
            })}
          </svg>

          {/* Tooltip */}
          {hoveredSegment && typeof window !== 'undefined' && (
            <div
              className="fixed z-50 bg-gray-900 dark:bg-gray-800 text-white px-3 py-2 rounded-lg shadow-xl pointer-events-none hidden md:block"
              style={{
                left: `${Math.min(hoveredSegment.x + 15, window.innerWidth - 200)}px`,
                top: `${Math.max(hoveredSegment.y - 80, 10)}px`,
                whiteSpace: "nowrap",
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: hoveredSegment.category.color }}
                />
                <div className="text-xs font-semibold uppercase">
                  {hoveredSegment.category.name}
                </div>
              </div>
              <div className="text-xs space-y-0.5 ml-4">
                <div className="font-medium">
                  {hoveredSegment.amount.toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  {getCurrencySymbol(currency)}
                </div>
                <div className="text-gray-400">
                  {hoveredSegment.percent.toFixed(1)}%
                </div>
              </div>
            </div>
          )}

          {/* center label */}
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          >
            <span className="text-[10px] text-gray-700 dark:text-gray-400 mb-0">TOTAL:</span>
            <span className="text-base font-black text-gray-900 dark:text-gray-100 -mt-0.5">
              {animatedTotal.toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              <span className="ml-0.5">{getCurrencySymbol(currency)}</span>
            </span>
          </div>
        </div>

        {/* Categories with animated percentages */}
        <div className="flex-1 min-w-0 space-y-3 text-sm">
          {sortedCategories.map((cat) => {
            const displayed = Math.round(cat.percent * progress);
            return (
              <div
                key={cat.name}
                className="flex items-center gap-2 min-w-0"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                        <span className="text-gray-900 dark:text-gray-200 truncate flex-1 min-w-0 uppercase">{cat.name}</span>
                <span 
                  className="font-semibold flex-shrink-0 ml-auto"
                  style={{ color: cat.color }}
                >
                  {displayed}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </section>
  );
}

