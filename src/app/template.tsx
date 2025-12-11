"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useRef, useEffect, useLayoutEffect } from "react";

const routeOrder: Record<string, number> = {
  "/": 0,
  "/add-expense": 1,
  "/parameters": 2,
};

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const previousPathnameRef = useRef<string | null>(null);
  
  // Calculer la direction basée sur le changement de route
  const getDirection = (): "left" | "right" => {
    if (previousPathnameRef.current === null) {
      previousPathnameRef.current = pathname;
      return "left";
    }
    
    const currentIndex = routeOrder[pathname] ?? 0;
    const previousIndex = routeOrder[previousPathnameRef.current] ?? 0;
    const newDirection = currentIndex > previousIndex ? "left" : "right";
    
    previousPathnameRef.current = pathname;
    return newDirection;
  };

  const direction = getDirection();

  // Remettre le scroll en haut lors du changement de route
  // Utiliser useLayoutEffect pour iOS afin de scroller avant le rendu
  useLayoutEffect(() => {
    // Scroll immédiat avant le rendu (critique pour iOS)
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      if (document.body) {
        (document.body as any).scrollTop = 0;
      }
    }
  }, [pathname]);

  useEffect(() => {
    // Fonction robuste pour scroller vers le haut, spécialement pour iOS
    const scrollToTop = () => {
      // Méthode 1: window.scrollTo avec différentes options
      try {
        window.scrollTo(0, 0);
        if ('scrollBehavior' in document.documentElement.style) {
          window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        }
      } catch (e) {
        // Ignore
      }
      
      // Méthode 2: Propriétés directes (critique pour iOS Safari)
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
        document.documentElement.scrollLeft = 0;
      }
      
      if (document.body) {
        (document.body as any).scrollTop = 0;
        (document.body as any).scrollLeft = 0;
      }
      
      // Méthode 3: Tous les éléments potentiellement scrollables
      const scrollableSelectors = [
        'main',
        '[role="main"]',
        '[data-scroll-container]',
        '.scroll-container',
        'div[style*="overflow"]',
      ];
      
      scrollableSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el: any) => {
          if (el && el.scrollTop !== undefined) {
            el.scrollTop = 0;
            el.scrollLeft = 0;
          }
        });
      });
    };

    // Utiliser requestAnimationFrame pour s'assurer que le DOM est prêt
    const rafId1 = requestAnimationFrame(() => {
      scrollToTop();
      
      // Sur iOS, utiliser plusieurs frames pour garantir
      const rafId2 = requestAnimationFrame(() => {
        scrollToTop();
        
        const rafId3 = requestAnimationFrame(() => {
          scrollToTop();
        });
        
        return () => cancelAnimationFrame(rafId3);
      });
      
      return () => cancelAnimationFrame(rafId2);
    });
    
    // Délais supplémentaires après l'animation de transition
    const timeoutId1 = setTimeout(() => {
      requestAnimationFrame(scrollToTop);
    }, 100);
    
    const timeoutId2 = setTimeout(() => {
      requestAnimationFrame(scrollToTop);
    }, 300); // Après l'animation (300ms)
    
    const timeoutId3 = setTimeout(() => {
      requestAnimationFrame(scrollToTop);
    }, 500);

    return () => {
      cancelAnimationFrame(rafId1);
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
    };
  }, [pathname]);

  const slideVariants = {
    initial: (dir: "left" | "right") => ({
      x: dir === "left" ? "100%" : "-100%",
      opacity: 0,
    }),
    animate: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: "left" | "right") => ({
      x: dir === "left" ? "-100%" : "100%",
      opacity: 0,
    }),
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        custom={direction}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={slideVariants}
        transition={{
          type: "tween",
          ease: "easeInOut",
          duration: 0.3,
        }}
        className="w-full overflow-hidden"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

