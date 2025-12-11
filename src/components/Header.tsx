"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const { user } = useAuth();

  // Obtenir le provider d'authentification
  const getProvider = () => {
    if (!user) return null;
    // Le provider peut être dans app_metadata ou déterminé par l'email
    const provider = user.app_metadata?.provider || 
                     (user.identities && user.identities[0]?.provider) ||
                     (user.email?.includes("@") ? "email" : null);
    return provider;
  };

  // Obtenir l'URL de la photo de profil
  const getAvatarUrl = () => {
    if (!user) return null;
    return user.user_metadata?.avatar_url || 
           user.user_metadata?.picture || 
           null;
  };

  // Initiales de l'utilisateur
  const getInitials = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  // Obtenir la couleur de fond pour les initiales (basée sur la première lettre)
  const getInitialsColor = () => {
    const letter = getInitials();
    const colors = [
      "#FF2D8A", "#8A2BFF", "#316CFF", "#FFC04A", "#10B981",
      "#F59E0B", "#EF4444", "#6366F1", "#06B6D4", "#EC4899"
    ];
    const index = letter.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const provider = getProvider();
  const avatarUrl = getAvatarUrl();
  const initialsColor = getInitialsColor();

  // Déterminer le style de bordure selon le provider
  const getBorderStyle = (): React.CSSProperties => {
    if (provider === "google") {
      // Bordure multi-couleur Google avec conic-gradient pour un cercle
      return {
        padding: "3px",
        background: "conic-gradient(from 0deg, #EA4335 0deg 90deg, #FBBC04 90deg 180deg, #34A853 180deg 270deg, #4285F4 270deg 360deg)",
        borderRadius: "50%",
      };
    } else if (provider === "facebook") {
      return {
        border: "3px solid #1877F2",
      };
    }
    return {}; // Pas de bordure pour email
  };

  // Classe pour le contenu interne
  const getInnerClassName = () => {
    return "w-full h-full rounded-full overflow-hidden" + (provider === "google" ? " bg-white" : "");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-2 backdrop-blur-md border-b border-white/10 pt-3">
      {/* Availo icon centered */}
      <Image
        src="/availo-icon.png"
        alt="Availo Icon"
        width={40}
        height={40}
        priority
      />

      {/* User avatar on the right - links to account page */}
      <div className="absolute right-4">
        {user ? (
          <Link
            href="/account"
            className="flex h-8 w-8 items-center justify-center rounded-full shadow-flowSoft hover:opacity-90 transition-opacity"
            style={getBorderStyle()}
            title="My account"
          >
            <div className={getInnerClassName()}>
              {avatarUrl && (provider === "google" || provider === "facebook") ? (
                <img
                  src={avatarUrl}
                  alt={user.email || "User"}
                  className="w-full h-full object-cover rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center rounded-full"
                  style={{ backgroundColor: provider === "email" ? initialsColor : "transparent" }}
                >
                  <span
                    className="text-[10px] font-semibold"
                    style={{
                      color: provider === "email" ? "white" : "#666",
                    }}
                  >
                    {getInitials()}
                  </span>
                </div>
              )}
            </div>
          </Link>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
            <span className="text-[10px] font-semibold text-gray-500">U</span>
          </div>
        )}
      </div>
    </header>
  );
}

