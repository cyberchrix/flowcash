"use client";

import { NavigationProvider } from "@/contexts/NavigationContext";
import { ModalProvider } from "@/contexts/ModalContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NavigationProvider>
      <ModalProvider>{children}</ModalProvider>
    </NavigationProvider>
  );
}

