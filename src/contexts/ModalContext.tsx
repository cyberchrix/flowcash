"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type ModalContextType = {
  isAddExpenseModalOpen: boolean;
  openAddExpenseModal: () => void;
  closeAddExpenseModal: () => void;
};

const ModalContext = createContext<ModalContextType>({
  isAddExpenseModalOpen: false,
  openAddExpenseModal: () => {},
  closeAddExpenseModal: () => {},
});

export function ModalProvider({ children }: { children: ReactNode }) {
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);

  const openAddExpenseModal = () => setIsAddExpenseModalOpen(true);
  const closeAddExpenseModal = () => setIsAddExpenseModalOpen(false);

  return (
    <ModalContext.Provider
      value={{
        isAddExpenseModalOpen,
        openAddExpenseModal,
        closeAddExpenseModal,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  return useContext(ModalContext);
}

