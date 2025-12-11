"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getUserSettings, updateUserSettings } from "@/lib/supabase/settings";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>("light");
  const [isInitialized, setIsInitialized] = useState(false);

  // Charger le thème depuis localStorage au démarrage
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as Theme | null;
    if (storedTheme === "dark" || storedTheme === "light") {
      setThemeState(storedTheme);
      applyTheme(storedTheme);
    } else {
      // Par défaut: light
      setThemeState("light");
      applyTheme("light");
    }
    setIsInitialized(true);
  }, []);

  // Charger le thème depuis la base de données une fois l'utilisateur connecté
  useEffect(() => {
    if (user && isInitialized) {
      const loadThemeFromDB = async () => {
        try {
          const settings = await getUserSettings(user.id);
          if (settings?.theme) {
            setThemeState(settings.theme as Theme);
            applyTheme(settings.theme as Theme);
            localStorage.setItem("theme", settings.theme);
          }
        } catch (error) {
          console.error("Error loading theme from database:", error);
        }
      };
      loadThemeFromDB();
    }
  }, [user, isInitialized]);

  // Appliquer le thème au document
  const applyTheme = (newTheme: Theme) => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (newTheme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  };

  // Fonction pour définir le thème
  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    // Sauvegarder dans la base de données si l'utilisateur est connecté
    if (user) {
      try {
        await updateUserSettings(user.id, { theme: newTheme });
      } catch (error) {
        console.error("Error saving theme to database:", error);
      }
    }
  };

  // Fonction pour basculer entre light et dark
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

