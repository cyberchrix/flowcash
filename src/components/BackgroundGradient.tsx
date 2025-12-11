"use client";

import { useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";

export function BackgroundGradient() {
  const { theme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (theme === "dark") {
      // Fond #191A1F pour le mode dark
      root.style.background = "#191A1F";
      root.style.backgroundImage = "";
      root.style.minHeight = "100vh";
      
      body.style.background = "#191A1F";
      body.style.backgroundImage = "";
      body.style.minHeight = "100vh";
      
      // Vérifier que la classe dark est bien présente
      if (!root.classList.contains("dark")) {
        root.classList.add("dark");
      }
    } else {
      root.style.background = "#F5F7FA";
      root.style.backgroundImage = "";
      body.style.background = "#F5F7FA";
      body.style.backgroundImage = "";
      root.style.backgroundAttachment = "";
      body.style.backgroundAttachment = "";
    }
  }, [theme]);

  return null;
}
