"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";

type NavigationContextType = {
  direction: "left" | "right";
  showSplash: boolean;
  hideSplash: () => void;
};

const NavigationContext = createContext<NavigationContextType>({
  direction: "left",
  showSplash: true,
  hideSplash: () => {},
});

const routeOrder: Record<string, number> = {
  "/": 0,
  "/add-expense": 1,
  "/parameters": 2,
};

export function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [direction, setDirection] = useState<"left" | "right">("left");
  const [previousPath, setPreviousPath] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (previousPath !== null && previousPath !== pathname) {
      const currentIndex = routeOrder[pathname] ?? 0;
      const previousIndex = routeOrder[previousPath] ?? 0;
      setDirection(currentIndex > previousIndex ? "left" : "right");
    }
    setPreviousPath(pathname);
  }, [pathname, previousPath]);

  // Cache le splash après 2.5 secondes uniquement si on est sur la page Home
  useEffect(() => {
    if (showSplash && pathname === "/") {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [showSplash, pathname]);

  // Si on navigue vers une autre page que Home, cacher immédiatement le splash
  useEffect(() => {
    if (pathname !== "/" && showSplash) {
      setShowSplash(false);
    }
  }, [pathname, showSplash]);

  const hideSplash = () => {
    setShowSplash(false);
  };

  return (
    <NavigationContext.Provider value={{ direction, showSplash, hideSplash }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  return useContext(NavigationContext);
}

