"use client";

import { NavigationProvider } from "@/contexts/NavigationContext";
import { ModalProvider } from "@/contexts/ModalContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { GlobalModals } from "./GlobalModals";
import { ScrollToTop } from "./ScrollToTop";
import { BackgroundGradient } from "./BackgroundGradient";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <BackgroundGradient />
      <NavigationProvider>
        <ModalProvider>
          <ToastProvider>
            <ScrollToTop />
            {children}
            <GlobalModals />
          </ToastProvider>
        </ModalProvider>
      </NavigationProvider>
    </ThemeProvider>
  );
}

