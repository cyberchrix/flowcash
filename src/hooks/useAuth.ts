"use client";

import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    // Get initial session first (fastest method)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      
      if (session?.user) {
        setUser(session.user);
        setLoading(false);
        
        // Then try to refresh user metadata in background
        supabase.auth.getUser().then(({ data: { user: fullUser } }) => {
          if (!mounted) return;
          if (fullUser) {
            setUser(fullUser);
          }
        }).catch(() => {
          // Ignore errors in background refresh
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    }).catch((error) => {
      console.error("Error getting session:", error);
      if (!mounted) return;
      setUser(null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      
      if (session?.user) {
        setUser(session.user);
        
        // Try to refresh user metadata in background
        supabase.auth.getUser().then(({ data: { user: fullUser } }) => {
          if (!mounted) return;
          if (fullUser) {
            setUser(fullUser);
          }
        }).catch(() => {
          // Ignore errors in background refresh
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}

