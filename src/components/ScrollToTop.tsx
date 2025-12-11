"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

export function ScrollToTop() {
  const pathname = usePathname();

  // useLayoutEffect s'exécute de manière synchrone AVANT la peinture
  // C'est crucial pour iOS Safari
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    // Scroll immédiat avant le rendu
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    if (document.body) {
      (document.body as any).scrollTop = 0;
    }
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Fonction agressive pour iOS
    const forceScrollToTop = () => {
      // Toutes les méthodes possibles
      try {
        window.scrollTo(0, 0);
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      } catch (e) {
        // Ignore
      }

      document.documentElement.scrollTop = 0;
      document.documentElement.scrollLeft = 0;
      
      if (document.body) {
        (document.body as any).scrollTop = 0;
        (document.body as any).scrollLeft = 0;
      }

      // Scroller tous les éléments scrollables
      const allElements = document.querySelectorAll('*');
      allElements.forEach((el: any) => {
        if (el.scrollTop !== undefined && el.scrollTop > 0) {
          el.scrollTop = 0;
        }
        if (el.scrollLeft !== undefined && el.scrollLeft !== 0) {
          el.scrollLeft = 0;
        }
      });

      // Méthode scrollIntoView pour iOS (très efficace)
      // Chercher l'ancre en haut de page
      const anchor = document.getElementById('page-top-anchor');
      if (anchor) {
        try {
          anchor.scrollIntoView({ behavior: 'auto', block: 'start', inline: 'nearest' });
        } catch (e) {
          // Fallback vers le premier élément
          const firstChild = document.body.firstElementChild;
          if (firstChild) {
            try {
              firstChild.scrollIntoView({ behavior: 'auto', block: 'start', inline: 'nearest' });
            } catch (e2) {
              // Ignore
            }
          }
        }
      } else {
        // Fallback si l'ancre n'existe pas
        const firstChild = document.body.firstElementChild;
        if (firstChild) {
          try {
            firstChild.scrollIntoView({ behavior: 'auto', block: 'start', inline: 'nearest' });
          } catch (e) {
            // Ignore
          }
        }
      }
    };

    // Essayer immédiatement
    forceScrollToTop();

    // Utiliser requestAnimationFrame plusieurs fois
    let rafId1: number;
    let rafId2: number;
    let rafId3: number;

    rafId1 = requestAnimationFrame(() => {
      forceScrollToTop();
      
      rafId2 = requestAnimationFrame(() => {
        forceScrollToTop();
        
        rafId3 = requestAnimationFrame(() => {
          forceScrollToTop();
        });
      });
    });

    // Délais après l'animation de transition (300ms)
    const timeouts = [
      setTimeout(forceScrollToTop, 50),
      setTimeout(forceScrollToTop, 100),
      setTimeout(forceScrollToTop, 200),
      setTimeout(forceScrollToTop, 350), // Après transition
      setTimeout(forceScrollToTop, 500),
      setTimeout(forceScrollToTop, 700),
    ];

    return () => {
      if (rafId1) cancelAnimationFrame(rafId1);
      if (rafId2) cancelAnimationFrame(rafId2);
      if (rafId3) cancelAnimationFrame(rafId3);
      timeouts.forEach(clearTimeout);
    };
  }, [pathname]);

  return null;
}

