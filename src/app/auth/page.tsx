"use client";

import { useState, useEffect } from "react";

// Force dynamic rendering to avoid build-time errors with Supabase
export const dynamic = 'force-dynamic';
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";
import { motion } from "framer-motion";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export default function AuthPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rediriger vers home si déjà connecté
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 bg-flowBg">
        <div className="text-flowTextMuted">Chargement...</div>
      </div>
    );
  }

  if (user) {
    return null; // Redirection en cours
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.push("/");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          console.error("Signup error:", error);
          throw error;
        }

        // Vérifier si l'inscription a réussi
        if (data.user) {
          // Après l'inscription, on se connecte automatiquement
          router.push("/");
          router.refresh();
        } else {
          throw new Error("L'inscription a échoué. Vérifiez vos informations.");
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      console.error("Error details:", {
        message: err?.message,
        status: err?.status,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
      });
      
      let errorMessage = "Une erreur est survenue";
      
      if (err) {
        // Afficher le message d'erreur original pour le debug
        errorMessage = err.message || err.toString() || "Une erreur est survenue";
        
        // Messages d'erreur plus clairs
        if (errorMessage.includes("Database error") || errorMessage.includes("database")) {
          errorMessage = `Erreur base de données: ${err.message || "Vérifiez que le schéma est correctement configuré dans Supabase."}`;
        } else if (errorMessage.includes("User already registered") || errorMessage.includes("already registered")) {
          errorMessage = "Cet email est déjà utilisé. Essayez de vous connecter.";
        } else if (errorMessage.includes("Invalid email")) {
          errorMessage = "Format d'email invalide.";
        } else if (errorMessage.includes("Password") || errorMessage.includes("password")) {
          errorMessage = "Le mot de passe doit contenir au moins 6 caractères.";
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 bg-flowBg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Image
            src="/availo-icon.png"
            alt="Availo"
            width={80}
            height={80}
            priority
          />
        </div>

        {/* Card */}
        <div
          className="rounded-[28px] bg-white border border-gray-200 px-6 py-8 shadow-sm"
          style={{
            fontFamily:
              'Inter Variable, ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", Segoe UI Symbol, "Noto Color Emoji"',
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          }}
        >
          <h1 className="text-2xl font-semibold text-flow-primary mb-2 text-center">
            {isLogin ? "Connexion" : "Inscription"}
          </h1>
          <p className="text-sm text-gray-600 mb-6 text-center">
            {isLogin
              ? "Connectez-vous pour accéder à votre compte"
              : "Créez un compte pour commencer"}
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-flow-primary focus:outline-none focus:ring-2 focus:ring-flow-primary/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 pr-10 focus:border-flow-primary focus:outline-none focus:ring-2 focus:ring-flow-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-flow-primary px-4 py-3 text-sm font-medium text-white hover:bg-flow-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Chargement..." : isLogin ? "Se connecter" : "S'inscrire"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-sm text-flow-primary hover:underline"
            >
              {isLogin
                ? "Pas encore de compte ? S'inscrire"
                : "Déjà un compte ? Se connecter"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

