"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

interface SummaryCardProps {
  salaryNet: number;
  totalExpenses: number;
  remaining: number;
  onSalaryUpdate?: (newSalary: number) => Promise<void>;
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
  onSalaryUpdate,
}: SummaryCardProps) {
  const animatedSalaryNet = useAnimatedNumber(salaryNet, 800);
  const animatedTotalExpenses = useAnimatedNumber(totalExpenses, 800);
  const animatedRemaining = useAnimatedNumber(remaining, 800);
  const [hasAnimated, setHasAnimated] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const [isEditingSalary, setIsEditingSalary] = useState(false);
  const [editSalaryValue, setEditSalaryValue] = useState("");
  const [isSavingSalary, setIsSavingSalary] = useState(false);
  const salaryInputRef = useRef<HTMLInputElement>(null);

  const handleSaveSalary = async () => {
    if (!onSalaryUpdate || isSavingSalary) return;

    const parsedValue = parseFloat(editSalaryValue.replace(/,/g, ""));
    if (isNaN(parsedValue) || parsedValue < 0) {
      setIsEditingSalary(false);
      setEditSalaryValue("");
      return;
    }

    setIsSavingSalary(true);
    try {
      await onSalaryUpdate(parsedValue);
      setIsEditingSalary(false);
      setEditSalaryValue("");
    } catch (error) {
      console.error("Error updating salary:", error);
      setIsEditingSalary(false);
      setEditSalaryValue("");
    } finally {
      setIsSavingSalary(false);
    }
  };

  useEffect(() => {
    // Déclencher l'animation seulement après que les données soient chargées
    if (salaryNet > 0 || totalExpenses > 0) {
      setHasAnimated(true);
      
      // Attendre que l'animation de translation soit terminée
      // Spring animation: durée approximative ~400-600ms + petit délai
      const timer = setTimeout(() => {
        playGlowAnimation();
      }, 400);
      
      return () => clearTimeout(timer);
    }
  }, [salaryNet, totalExpenses]);

  const playGlowAnimation = () => {
    const $card = cardRef.current;
    if (!$card) return;

    // Initialiser les valeurs à 0 pour un démarrage propre
    $card.style.setProperty('--pointer-°', '110deg');
    $card.style.setProperty('--pointer-d', '0');
    $card.style.setProperty('--glow-intensity', '0');
    
    // Petit délai avant de commencer l'animation pour plus de fluidité
    setTimeout(() => {
      $card.classList.add('animating');

      // Animation initiale : distance de 0 à 100
      let startTime = performance.now();
      const duration1 = 500;
      const glowSens = 50;
    
    const animate1 = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration1, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const value = eased * 100;
      const glowIntensity = Math.max(0, Math.min(1, (value - glowSens) / (100 - glowSens)));
      
      $card.style.setProperty('--pointer-d', `${value}`);
      $card.style.setProperty('--glow-intensity', `${glowIntensity}`);
      
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
                  const glowSens = 50;
                  const glowIntensity = Math.max(0, Math.min(1, (value - glowSens) / (100 - glowSens)));
                  
                  $card.style.setProperty('--pointer-d', `${value}`);
                  $card.style.setProperty('--glow-intensity', `${glowIntensity}`);
                  
                  if (progress < 1) {
                    requestAnimationFrame(animate4);
                  } else {
                    $card.style.setProperty('--glow-intensity', '0');
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
    }, 0); // Pas de délai supplémentaire
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

    let isHovering = false;

    const cardUpdate = (e: PointerEvent) => {
      const position = pointerPositionRelativeToElement($card, e);
      const [px, py] = position.pixels;
      const [dx, dy] = distanceFromCenter($card, px, py);
      const edge = closenessToEdge($card, px, py);
      const angle = angleFromPointerEvent($card, dx, dy);
      const glowSens = 50; // Same as CSS --glow-sens
      const glowIntensity = Math.max(0, Math.min(1, (edge * 100 - glowSens) / (100 - glowSens)));

      $card.style.setProperty('--pointer-°', `${round(angle)}deg`);
      $card.style.setProperty('--pointer-d', `${round(edge * 100)}`);
      // Si on est en hover, utiliser au minimum 0.6, sinon utiliser la valeur calculée
      const minIntensity = isHovering ? 0.6 : 0;
      $card.style.setProperty('--glow-intensity', `${Math.max(minIntensity, glowIntensity)}`);
      $card.classList.remove('animating');
    };

    const handleMouseEnter = () => {
      isHovering = true;
      if (!$card.classList.contains('animating')) {
        // Le CSS :hover devrait déjà définir --glow-intensity: 0.6
        // Mais on peut aussi le définir explicitement pour être sûr
        $card.style.setProperty('--glow-intensity', '0.6');
      }
    };

    const handleMouseLeave = () => {
      isHovering = false;
      if (!$card.classList.contains('animating')) {
        $card.style.setProperty('--glow-intensity', '0');
      }
    };

    $card.addEventListener("pointermove", cardUpdate);
    $card.addEventListener("mouseenter", handleMouseEnter);
    $card.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      $card.removeEventListener("pointermove", cardUpdate);
      $card.removeEventListener("mouseenter", handleMouseEnter);
      $card.removeEventListener("mouseleave", handleMouseLeave);
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
      style={{ overflow: "visible" }}
    >
      <section ref={cardRef} className="summary-card-wrapper">
        <div className="summary-card-glow" />
        <div
          className="rounded-[24px] relative overflow-hidden h-full w-full"
          style={{
            fontFamily:
              '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "Courier New", monospace',
            background: "linear-gradient(to right, #FF2D8A, #8A2BFF, #316CFF)",
            letterSpacing: "0.5px",
            padding: "1.5rem",
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
            textRendering: "optimizeLegibility",
            transform: "translateZ(0)",
            position: "relative",
            zIndex: 2, // Au-dessus du glow
            isolation: "isolate", // Isoler le contenu du mix-blend-mode du glow
          }}
        >
        {/* Wave background */}
        <div className="absolute inset-0 opacity-20 overflow-hidden">
          <svg
            viewBox="0 0 1200 320"
            className="absolute bottom-0 left-0 w-full"
            preserveAspectRatio="none"
            style={{ height: "120%", width: "100%", bottom: "-20%" }}
          >
            <path
              d="M0,160L48,144C96,128,192,96,288,101.3C384,107,480,149,576,154.7C672,160,768,128,864,112C960,96,1056,96,1152,112C1248,128,1344,160,1392,176L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
              fill="white"
              opacity="0.3"
              className="wave-path-1"
            />
            <path
              d="M0,192L48,181.3C96,171,192,149,288,154.7C384,160,480,192,576,186.7C672,181,768,139,864,122.7C960,107,1056,117,1152,133.3C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
              fill="white"
              opacity="0.2"
              className="wave-path-2"
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

          {isEditingSalary ? (
            <div className="mt-1 flex items-center gap-2">
              <input
                ref={salaryInputRef}
                type="number"
                step="0.01"
                value={editSalaryValue}
                onChange={(e) => setEditSalaryValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveSalary();
                  } else if (e.key === "Escape") {
                    setIsEditingSalary(false);
                    setEditSalaryValue("");
                  }
                }}
                onBlur={handleSaveSalary}
                className="text-3xl font-bold text-white bg-transparent border-b-2 border-white/50 focus:border-white focus:outline-none w-32"
                style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.4), 0 0.5px 1px rgba(0, 0, 0, 0.6)" }}
                disabled={isSavingSalary}
                autoFocus
              />
              <span className="text-3xl font-bold text-white" style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.4), 0 0.5px 1px rgba(0, 0, 0, 0.6)" }}>
                €
              </span>
            </div>
          ) : (
            <div 
              className="mt-1 text-3xl font-bold text-white cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => {
                if (onSalaryUpdate) {
                  setIsEditingSalary(true);
                  setEditSalaryValue(Math.round(salaryNet).toString());
                  setTimeout(() => salaryInputRef.current?.focus(), 0);
                }
              }}
              style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.4), 0 0.5px 1px rgba(0, 0, 0, 0.6)" }}
              title={onSalaryUpdate ? "Click to edit" : undefined}
            >
              {Math.round(animatedSalaryNet).toLocaleString("fr-FR")} €
            </div>
          )}

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
                    ? "rgba(99, 216, 179, 0.8)" // #63D8B3
                    : "rgba(239, 68, 68, 0.8)", // rouge
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

