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
  "/analytics": 0,
  "/budget": 1,
  "/transactions": 2,
  "/overview": 3,
  "/calendar": 3,
  "/expenses": 3,
  "/history": 3,
  "/add-expense": 3,
  "/parameters": 4,
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

  // Cache le splash après 800ms uniquement si on est sur la page Home
  useEffect(() => {
    if (showSplash && pathname === "/") {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 800);

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

