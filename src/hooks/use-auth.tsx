import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isProfileComplete: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  isAdmin: false,
  isProfileComplete: true,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(true);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  const fetchProfileAndCheckComplete = async (userId: string) => {
    try {
      const isMock = !!localStorage.getItem("pawhaven_mock_session");
      if (isMock) {
        const stored = localStorage.getItem(`pawhaven_profile_${userId}`);
        if (!stored) {
          setIsProfileComplete(false);
          return;
        }
        try {
          const parsed = JSON.parse(stored);
          const complete = !!(
            parsed.full_name?.trim() &&
            parsed.phone?.trim() &&
            parsed.address_line?.trim() &&
            parsed.city?.trim() &&
            parsed.postal_code?.trim() &&
            parsed.country?.trim()
          );
          setIsProfileComplete(complete);
          return;
        } catch {
          setIsProfileComplete(false);
          return;
        }
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      if (!profile) {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (authUser) {
          const fullName = authUser.user_metadata?.full_name || authUser.email || "User";
          await supabase.from("profiles").insert({
            id: userId,
            full_name: fullName,
          });
        }
        setIsProfileComplete(false);
        return;
      }

      const complete = !!(
        profile.full_name?.trim() &&
        profile.phone?.trim() &&
        profile.address_line?.trim() &&
        profile.city?.trim() &&
        profile.postal_code?.trim() &&
        profile.country?.trim()
      );
      setIsProfileComplete(complete);
    } catch (err) {
      console.error("Error checking profile status:", err);
      setIsProfileComplete(true);
    }
  };

  const checkAndClaimAdmin = async (userId: string) => {
    try {
      // Backup check: if user email is woolf.indiaa@gmail.com or woolf.india@gmail.com, force isAdmin to true
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (
        authUser?.email &&
        ["woolf.indiaa@gmail.com", "woolf.india@gmail.com"].includes(authUser.email)
      ) {
        setIsAdmin(true);
        return;
      }

      const { data: r } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (r) {
        setIsAdmin(true);
      } else {
        // Try to claim the first admin role if no admin exists
        const { data: claimed } = await supabase.rpc("claim_first_admin");
        setIsAdmin(!!claimed);
      }
    } catch (e) {
      console.warn("Failed to check or claim admin role:", e);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    const checkMockAuth = () => {
      if (typeof window === "undefined") return false;
      const stored = localStorage.getItem("pawhaven_mock_session");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSession({ user: parsed.user } as any);
          setIsAdmin(
            parsed.isAdmin ||
              (parsed.user?.email &&
                ["woolf.indiaa@gmail.com", "woolf.india@gmail.com"].includes(parsed.user.email)),
          );
          fetchProfileAndCheckComplete(parsed.user.id);
          setLoading(false);
          return true;
        } catch (e) {
          console.error("Failed to parse mock session:", e);
        }
      }
      return false;
    };

    const handleAuthChange = () => {
      if (!checkMockAuth()) {
        supabase.auth.getSession().then(({ data }) => {
          setSession(data.session);
          setLoading(false);
          if (data.session?.user) {
            fetchProfileAndCheckComplete(data.session.user.id);
            checkAndClaimAdmin(data.session.user.id);
          } else {
            setIsAdmin(false);
            setIsProfileComplete(true);
          }
        });
      }
    };

    window.addEventListener("auth-change", handleAuthChange);

    // If mock auth is present, don't query Supabase auth initially
    if (!checkMockAuth()) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_e, s) => {
        if (!localStorage.getItem("pawhaven_mock_session")) {
          setSession(s);
          qc.invalidateQueries();
          if (s?.user) {
            fetchProfileAndCheckComplete(s.user.id);
            setTimeout(() => {
              checkAndClaimAdmin(s.user.id);
            }, 0);
          } else {
            setIsAdmin(false);
            setIsProfileComplete(true);
          }
        }
      });

      supabase.auth.getSession().then(({ data }) => {
        if (!localStorage.getItem("pawhaven_mock_session")) {
          setSession(data.session);
          setLoading(false);
          if (data.session?.user) {
            fetchProfileAndCheckComplete(data.session.user.id);
            checkAndClaimAdmin(data.session.user.id);
          }
        }
      });

      return () => {
        subscription.unsubscribe();
        window.removeEventListener("auth-change", handleAuthChange);
      };
    }

    return () => {
      window.removeEventListener("auth-change", handleAuthChange);
    };
  }, [qc]);

  const signOut = async () => {
    localStorage.removeItem("pawhaven_mock_session");
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("pawhaven_skip_onboarding");
    }
    window.dispatchEvent(new Event("auth-change"));
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await fetchProfileAndCheckComplete(session.user.id);
    }
  };

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        isAdmin,
        isProfileComplete,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
