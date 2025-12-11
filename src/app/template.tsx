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
    window.scrollTo(0, 0);
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

