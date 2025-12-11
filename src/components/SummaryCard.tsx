"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

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
  const [hasAnimated, setHasAnimated] = useState(false);
  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Déclencher l'animation seulement après que les données soient chargées
    if (salaryNet > 0 || totalExpenses > 0) {
      setHasAnimated(true);
      
      // Attendre que l'animation de translation soit terminée
      // Spring animation: durée approximative ~800-1000ms + délai pour fluidité
      const timer = setTimeout(() => {
        playGlowAnimation();
      }, 1200);
      
      return () => clearTimeout(timer);
    }
  }, [salaryNet, totalExpenses]);

  const playGlowAnimation = () => {
    const $card = cardRef.current;
    if (!$card) return;

    // Initialiser les valeurs à 0 pour un démarrage propre
    $card.style.setProperty('--pointer-°', '110deg');
    $card.style.setProperty('--pointer-d', '0');
    
    // Petit délai avant de commencer l'animation pour plus de fluidité
    setTimeout(() => {
      $card.classList.add('animating');

      // Animation initiale : distance de 0 à 100
      let startTime = performance.now();
      const duration1 = 500;
    
    const animate1 = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration1, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const value = eased * 100;
      
      $card.style.setProperty('--pointer-d', `${value}`);
      
      if (progress < 1) {
        requestAnimationFrame(animate1);
      } else {
        // Animation de rotation : angle de 110 à 465 deg
        startTime = performance.now();
        const duration2 = 1500;
        const angleStart = 110;
        const angleEnd = 465;
        
        const animate2 = () => {
          const elapsed = performance.now() - startTime;
          const progress = Math.min(elapsed / duration2, 1);
          const eased = Math.pow(progress, 3); // easeInCubic
          const angle = angleStart + (angleEnd - angleStart) * eased;
          
          $card.style.setProperty('--pointer-°', `${angle}deg`);
          
          if (progress < 1) {
            requestAnimationFrame(animate2);
          } else {
            // Animation finale : rotation continue puis fade out
            startTime = performance.now();
            const duration3 = 2250;
            
            const animate3 = () => {
              const elapsed = performance.now() - startTime;
              const progress = Math.min(elapsed / duration3, 1);
              const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
              const angle = angleStart + (angleEnd - angleStart) * (1 - eased * 0.5);
              
              $card.style.setProperty('--pointer-°', `${angle}deg`);
              
              if (progress < 1) {
                requestAnimationFrame(animate3);
              } else {
                // Fade out de la distance
                startTime = performance.now();
                const duration4 = 1500;
                
                const animate4 = () => {
                  const elapsed = performance.now() - startTime;
                  const progress = Math.min(elapsed / duration4, 1);
                  const eased = Math.pow(progress, 3); // easeInCubic
                  const value = 100 * (1 - eased);
                  
                  $card.style.setProperty('--pointer-d', `${value}`);
                  
                  if (progress < 1) {
                    requestAnimationFrame(animate4);
                  } else {
                    $card.classList.remove('animating');
                  }
                };
                
                requestAnimationFrame(animate4);
              }
            };
            
            requestAnimationFrame(animate3);
          }
        };
        
        requestAnimationFrame(animate2);
      }
    };
    
    requestAnimationFrame(animate1);
    }, 200); // Délai de 200ms après la fin de la translation
  };

  useEffect(() => {
    const $card = cardRef.current;
    if (!$card) return;

    const centerOfElement = ($el: HTMLElement) => {
      const { width, height } = $el.getBoundingClientRect();
      return [width / 2, height / 2];
    };

    const pointerPositionRelativeToElement = ($el: HTMLElement, e: PointerEvent) => {
      const pos = [e.clientX, e.clientY];
      const { left, top, width, height } = $el.getBoundingClientRect();
      const x = pos[0] - left;
      const y = pos[1] - top;
      const px = clamp((100 / width) * x, 0, 100);
      const py = clamp((100 / height) * y, 0, 100);
      return { pixels: [x, y], percent: [px, py] };
    };

    const angleFromPointerEvent = ($el: HTMLElement, dx: number, dy: number) => {
      let angleDegrees = 0;
      if (dx !== 0 || dy !== 0) {
        const angleRadians = Math.atan2(dy, dx);
        angleDegrees = angleRadians * (180 / Math.PI) + 90;
        if (angleDegrees < 0) {
          angleDegrees += 360;
        }
      }
      return angleDegrees;
    };

    const distanceFromCenter = ($card: HTMLElement, x: number, y: number) => {
      const [cx, cy] = centerOfElement($card);
      return [x - cx, y - cy];
    };

    const closenessToEdge = ($card: HTMLElement, x: number, y: number) => {
      const [cx, cy] = centerOfElement($card);
      const [dx, dy] = distanceFromCenter($card, x, y);
      let k_x = Infinity;
      let k_y = Infinity;
      if (dx !== 0) {
        k_x = cx / Math.abs(dx);
      }
      if (dy !== 0) {
        k_y = cy / Math.abs(dy);
      }
      return clamp(1 / Math.min(k_x, k_y), 0, 1);
    };

    const clamp = (value: number, min: number = 0, max: number = 100) =>
      Math.min(Math.max(value, min), max);

    const round = (value: number, precision: number = 3) => parseFloat(value.toFixed(precision));

    const cardUpdate = (e: PointerEvent) => {
      const position = pointerPositionRelativeToElement($card, e);
      const [px, py] = position.pixels;
      const [dx, dy] = distanceFromCenter($card, px, py);
      const edge = closenessToEdge($card, px, py);
      const angle = angleFromPointerEvent($card, dx, dy);

      $card.style.setProperty('--pointer-°', `${round(angle)}deg`);
      $card.style.setProperty('--pointer-d', `${round(edge * 100)}`);
      $card.classList.remove('animating');
    };

    $card.addEventListener("pointermove", cardUpdate);

    return () => {
      $card.removeEventListener("pointermove", cardUpdate);
    };
  }, []);

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={hasAnimated ? { y: 0, opacity: 1 } : { y: -100, opacity: 0 }}
      transition={{
        type: "spring",
        stiffness: 120,
        damping: 20,
        mass: 0.8,
      }}
    >
      <section ref={cardRef} className="summary-card-wrapper">
        <div className="summary-card-glow" />
        <div
          className="rounded-3xl relative overflow-hidden h-full w-full"
          style={{
            fontFamily:
              '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "Courier New", monospace',
            background: "linear-gradient(to right, #FF2D8A, #8A2BFF, #316CFF)",
            letterSpacing: "0.5px",
            padding: "1.5rem",
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
          <h2 className="text-sm font-semibold text-white mb-4 uppercase">
            Summary
          </h2>

          <div className="text-sm font-medium text-white/90 uppercase">
            Net Income
          </div>

          <div 
            className="mt-1 text-3xl font-bold text-white"
            style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.4), 0 0.5px 1px rgba(0, 0, 0, 0.6)" }}
          >
            {Math.round(animatedSalaryNet).toLocaleString("fr-FR")} €
          </div>

          <div className="mt-3 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-white/90 uppercase">
                Total Expenses
              </div>
              <div 
                className="mt-1 text-xl font-bold text-white"
                style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.4), 0 0.5px 1px rgba(0, 0, 0, 0.6)" }}
              >
                {animatedTotalExpenses.toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                €
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-white/90 uppercase">
                Disposable Income
              </div>
              <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-white"
                style={{
                  backgroundColor: remaining >= 0 
                    ? "rgba(34, 197, 94, 0.4)" // vert doux transparent
                    : "rgba(239, 68, 68, 0.4)", // rouge doux transparent
                }}
              >
                <span 
                  className="text-xl"
                  style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.4), 0 0.5px 1px rgba(0, 0, 0, 0.6)" }}
                >
                  {remaining >= 0 ? "+" : "-"}
                </span>
                <span 
                  className="text-xl"
                  style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.4), 0 0.5px 1px rgba(0, 0, 0, 0.6)" }}
                >
                  {Math.abs(Math.round(animatedRemaining)).toLocaleString("fr-FR", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}{" "}
                  €
                </span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>
    </motion.div>
  );
}

