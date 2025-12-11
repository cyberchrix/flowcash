"use client";

import { NavigationProvider } from "@/contexts/NavigationContext";
import { ModalProvider } from "@/contexts/ModalContext";
import { GlobalModals } from "./GlobalModals";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NavigationProvider>
      <ModalProvider>
        {children}
        <GlobalModals />
      </ModalProvider>
    </NavigationProvider>
  );
}

