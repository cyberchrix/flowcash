"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { ArrowRightOnRectangleIcon, TrashIcon } from "@heroicons/react/24/outline";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function AccountPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  // Rediriger vers /auth si l'utilisateur n'est pas connecté
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [user, authLoading, router]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/auth");
      router.refresh();
    } catch (err) {
      console.error("Error logging out:", err);
      setError("Erreur lors de la déconnexion");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "SUPPRIMER") {
      setError("Veuillez taper 'SUPPRIMER' en majuscules pour confirmer");
      return;
    }

    setDeletingAccount(true);
    setError(null);

    try {
      // Appeler l'API pour supprimer le compte et toutes les données
      // Inclure les credentials pour que les cookies soient envoyés
      const response = await fetch("/api/user/delete", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la suppression du compte");
      }

      // Déconnecter l'utilisateur
      await supabase.auth.signOut();
      
      // Rediriger vers la page d'authentification
      router.push("/auth");
      router.refresh();
    } catch (err) {
      console.error("Error deleting account:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la suppression du compte. Veuillez réessayer."
      );
      setDeletingAccount(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 bg-flowBg">
        <div className="text-flowTextMuted">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirection en cours
  }

  return (
    <>
      <div id="page-top-anchor" className="absolute top-0 left-0 w-1 h-1 opacity-0 pointer-events-none" aria-hidden="true" />
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 bg-flowBg">
      <Header />

      <main className="flex-1 space-y-6 pt-20 pb-28">
        {/* Section Informations du compte */}
        <div
          className="rounded-[28px] bg-white border border-gray-200 px-6 py-5"
          style={{
            fontFamily:
              'Inter Variable, ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", Segoe UI Symbol, "Noto Color Emoji"',
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          }}
        >
          <h1 className="text-2xl font-semibold text-flow-primary mb-2">
            Mon compte
          </h1>
          <p className="text-sm text-flowTextMuted mb-6">
            Gérez votre compte et vos préférences
          </p>

          {/* Informations utilisateur */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Email
              </label>
              <div className="text-sm font-medium text-gray-900">
                {user.email}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Identifiant
              </label>
              <div className="text-xs font-mono text-gray-600 break-all">
                {user.id}
              </div>
            </div>
          </div>
        </div>

        {/* Section Déconnexion */}
        <div
          className="rounded-[28px] bg-white border border-gray-200 px-6 py-5"
          style={{
            fontFamily:
              'Inter Variable, ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", Segoe UI Symbol, "Noto Color Emoji"',
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          }}
        >
          <h2 className="text-lg font-semibold text-flow-primary mb-2">
            Déconnexion
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Déconnectez-vous de votre compte. Vous pourrez vous reconnecter à tout moment.
          </p>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            Se déconnecter
          </button>
        </div>

        {/* Section Suppression de compte */}
        <div
          className="rounded-[28px] bg-white border border-red-200 px-6 py-5"
          style={{
            fontFamily:
              'Inter Variable, ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", Segoe UI Symbol, "Noto Color Emoji"',
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          }}
        >
          <h2 className="text-lg font-semibold text-red-600 mb-2">
            Zone de danger
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            La suppression de votre compte est irréversible. Toutes vos données (dépenses, catégories, paramètres) seront définitivement supprimées.
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!showDeleteAccount ? (
            <button
              onClick={() => setShowDeleteAccount(true)}
              className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-red-500 bg-white px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <TrashIcon className="h-5 w-5" />
              Supprimer mon compte
            </button>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-800 font-medium mb-2">
                  ⚠️ Attention : Cette action est irréversible
                </p>
                <ul className="text-xs text-red-700 space-y-1 list-disc list-inside mb-4">
                  <li>Toutes vos dépenses seront supprimées</li>
                  <li>Toutes vos catégories seront supprimées</li>
                  <li>Vos paramètres seront supprimés</li>
                  <li>Votre compte sera définitivement supprimé</li>
                </ul>
                <div>
                  <label className="block text-sm font-medium text-red-800 mb-2">
                    Tapez <strong>SUPPRIMER</strong> pour confirmer
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="SUPPRIMER"
                    className="w-full rounded-lg border border-red-300 px-4 py-2 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteAccount(false);
                    setDeleteConfirmText("");
                    setError(null);
                  }}
                  disabled={deletingAccount}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount || deleteConfirmText !== "SUPPRIMER"}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingAccount ? "Suppression..." : "Supprimer définitivement"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
    </>
  );
}

