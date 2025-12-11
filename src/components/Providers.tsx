"use client";

import { NavigationProvider } from "@/contexts/NavigationContext";
import { ModalProvider } from "@/contexts/ModalContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { GlobalModals } from "./GlobalModals";
import { ScrollToTop } from "./ScrollToTop";
import { BackgroundGradient } from "./BackgroundGradient";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <BackgroundGradient />
      <NavigationProvider>
        <ModalProvider>
          <ScrollToTop />
          {children}
          <GlobalModals />
        </ModalProvider>
      </NavigationProvider>
    </ThemeProvider>
  );
}

