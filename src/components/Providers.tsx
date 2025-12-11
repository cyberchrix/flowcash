"use client";

import { NavigationProvider } from "@/contexts/NavigationContext";
import { ModalProvider } from "@/contexts/ModalContext";
import { GlobalModals } from "./GlobalModals";
import { ScrollToTop } from "./ScrollToTop";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NavigationProvider>
      <ModalProvider>
        <ScrollToTop />
        {children}
        <GlobalModals />
      </ModalProvider>
    </NavigationProvider>
  );
}

