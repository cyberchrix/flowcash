"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AddExpenseModal } from "./AddExpenseModal";
import { useModal } from "@/contexts/ModalContext";
import { useAuth } from "@/hooks/useAuth";
import { getCategories } from "@/lib/supabase/categories";
import { Category } from "@/types";

export function GlobalModals() {
  const { isAddExpenseModalOpen, closeAddExpenseModal } = useModal();
  const { user } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Charger les catégories quand le modal s'ouvre et qu'un utilisateur est connecté
  useEffect(() => {
    const loadCategories = async () => {
      if (!user || !isAddExpenseModalOpen) {
        return;
      }

      setLoadingCategories(true);
      try {
        const categoriesData = await getCategories(user.id);
        setCategories(
          categoriesData.map((cat) => ({
            id: cat.id,
            name: cat.name,
            color: cat.color,
            percent: 0, // Pas nécessaire pour le modal
          }))
        );
      } catch (error) {
        console.error("Error loading categories:", error);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, [user, isAddExpenseModalOpen]);

  const handleExpenseAdded = () => {
    // Rafraîchir la page actuelle pour mettre à jour les données
    router.refresh();
    // Si on est sur la page home, on peut aussi forcer un rechargement
    if (window.location.pathname === "/") {
      window.location.reload();
    }
  };

  if (!user) {
    return null;
  }

  return (
    <AddExpenseModal
      isOpen={isAddExpenseModalOpen}
      onClose={closeAddExpenseModal}
      categories={categories}
      onExpenseAdded={handleExpenseAdded}
    />
  );
}

