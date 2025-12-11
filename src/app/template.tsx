"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useRef, useEffect } from "react";

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
  useEffect(() => {
    // Utiliser plusieurs méthodes pour garantir que ça fonctionne, surtout sur iOS
    const scrollToTop = () => {
      // Méthode 1: window.scrollTo (standard)
      if (window.scrollTo) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        window.scrollTo(0, 0);
      }
      
      // Méthode 2: Propriétés directes (importantes pour iOS)
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
        document.documentElement.scrollLeft = 0;
      }
      
      if (document.body) {
        document.body.scrollTop = 0;
        document.body.scrollLeft = 0;
      }
      
      // Méthode 3: scrollIntoView pour iOS
      const scrollableElements = [
        document.documentElement,
        document.body,
        document.querySelector('main'),
        document.querySelector('[data-scroll-container]'),
      ].filter(Boolean) as Element[];
      
      scrollableElements.forEach((el) => {
        if (el.scrollTop > 0) {
          el.scrollTop = 0;
          el.scrollLeft = 0;
          // Utiliser scrollIntoView comme fallback pour iOS
          try {
            el.scrollIntoView({ behavior: 'instant', block: 'start' });
          } catch (e) {
            // Ignore si scrollIntoView n'est pas supporté avec ces options
          }
        }
      });
      
      // Méthode 4: Forcer le scroll sur tous les éléments scrollables trouvés
      const allElements = document.querySelectorAll('*');
      allElements.forEach((el) => {
        const element = el as HTMLElement;
        if (element.scrollTop && element.scrollTop > 0) {
          element.scrollTop = 0;
        }
      });
    };

    // Sur iOS, il faut parfois attendre que le rendu soit complet
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // Faire le scroll immédiatement et aussi après plusieurs délais
    scrollToTop();
    const timeoutId1 = setTimeout(scrollToTop, 50);
    const timeoutId2 = setTimeout(scrollToTop, 100);
    const timeoutId3 = setTimeout(scrollToTop, 200);
    const timeoutId4 = setTimeout(scrollToTop, 350); // Après la fin de l'animation (300ms + marge)
    
    // Sur iOS, ajouter des tentatives supplémentaires
    let iosTimeouts: NodeJS.Timeout[] = [];
    if (isIOS) {
      iosTimeouts = [
        setTimeout(scrollToTop, 400),
        setTimeout(scrollToTop, 500),
        setTimeout(scrollToTop, 700),
      ];
    }

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      clearTimeout(timeoutId4);
      iosTimeouts.forEach(clearTimeout);
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

