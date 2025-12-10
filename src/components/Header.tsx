"use client";

import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export function Header() {
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  };

  // Initiales de l'utilisateur
  const getInitials = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
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

      {/* User avatar on the right with logout option */}
      <div className="absolute right-4">
        <button
          onClick={handleLogout}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-flow-primary shadow-flowSoft hover:bg-flow-primary/90 transition-colors"
          title="Déconnexion"
        >
          <span className="text-[10px] font-semibold text-white">
            {getInitials()}
          </span>
        </button>
      </div>
    </header>
  );
}

