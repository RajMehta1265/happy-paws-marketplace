import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
      let profileName = "";
      if (isMock) {
        const stored = localStorage.getItem(`pawhaven_profile_${userId}`);
        if (!stored) {
          setIsProfileComplete(false);
          const storedMock = localStorage.getItem("pawhaven_mock_session");
          if (storedMock) {
            try {
              const parsedMock = JSON.parse(storedMock);
              profileName = parsedMock.user?.user_metadata?.full_name || parsedMock.user?.email || "User";
            } catch {}
          }
        } else {
          try {
            const parsed = JSON.parse(stored);
            profileName = parsed.full_name || "";
            const complete = !!(
              parsed.full_name?.trim() &&
              parsed.phone?.trim() &&
              parsed.address_line?.trim() &&
              parsed.city?.trim() &&
              parsed.postal_code?.trim() &&
              parsed.country?.trim()
            );
            setIsProfileComplete(complete);
          } catch {
            setIsProfileComplete(false);
          }
        }
      } else {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (error) throw error;

        if (profile) {
          profileName = profile.full_name || "";
          const complete = !!(
            profile.full_name?.trim() &&
            profile.phone?.trim() &&
            profile.address_line?.trim() &&
            profile.city?.trim() &&
            profile.postal_code?.trim() &&
            profile.country?.trim()
          );
          setIsProfileComplete(complete);
        } else {
          const {
            data: { user: authUser },
          } = await supabase.auth.getUser();
          if (authUser) {
            const fullName = authUser.user_metadata?.full_name || authUser.email || "User";
            profileName = fullName;
            await supabase.from("profiles").insert({
              id: userId,
              full_name: fullName,
            });
          }
          setIsProfileComplete(false);
        }
      }

      // Display "Welcome back, name!!" on revisit
      if (typeof window !== "undefined") {
        const welcomed = sessionStorage.getItem("woolf_welcome_back_shown");
        if (!welcomed) {
          sessionStorage.setItem("woolf_welcome_back_shown", "true");
          const displayName = profileName || "User";
          setTimeout(() => {
            toast.success(`Welcome back, ${displayName}!`);
          }, 600);
        }
      }
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
        supabase.auth.getSession().then(async ({ data }) => {
          let currentSession = data.session;
          if (!currentSession) {
            const backup = localStorage.getItem("pawhaven_session_backup");
            if (backup) {
              try {
                const parsed = JSON.parse(backup);
                if (parsed && parsed.access_token && parsed.refresh_token) {
                  const { data: restored, error } = await supabase.auth.setSession({
                    access_token: parsed.access_token,
                    refresh_token: parsed.refresh_token,
                  });
                  if (!error && restored.session) {
                    currentSession = restored.session;
                  }
                }
              } catch (e) {
                console.warn("Failed to restore session from backup:", e);
              }
            }
          }

          setSession(currentSession);
          setLoading(false);
          if (currentSession?.user) {
            fetchProfileAndCheckComplete(currentSession.user.id);
            checkAndClaimAdmin(currentSession.user.id);
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
            localStorage.setItem("pawhaven_session_backup", JSON.stringify({
              access_token: s.access_token,
              refresh_token: s.refresh_token,
            }));
            fetchProfileAndCheckComplete(s.user.id);
            setTimeout(() => {
              checkAndClaimAdmin(s.user.id);
            }, 0);
          } else {
            localStorage.removeItem("pawhaven_session_backup");
            setIsAdmin(false);
            setIsProfileComplete(true);
          }
        }
      });

      supabase.auth.getSession().then(async ({ data }) => {
        if (!localStorage.getItem("pawhaven_mock_session")) {
          let currentSession = data.session;
          if (!currentSession) {
            const backup = localStorage.getItem("pawhaven_session_backup");
            if (backup) {
              try {
                const parsed = JSON.parse(backup);
                if (parsed && parsed.access_token && parsed.refresh_token) {
                  const { data: restored, error } = await supabase.auth.setSession({
                    access_token: parsed.access_token,
                    refresh_token: parsed.refresh_token,
                  });
                  if (!error && restored.session) {
                    currentSession = restored.session;
                  }
                }
              } catch (e) {
                console.warn("Failed to restore session from backup:", e);
              }
            }
          }

          setSession(currentSession);
          setLoading(false);
          if (currentSession?.user) {
            fetchProfileAndCheckComplete(currentSession.user.id);
            checkAndClaimAdmin(currentSession.user.id);
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
    localStorage.removeItem("pawhaven_session_backup");
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("pawhaven_skip_onboarding");
      sessionStorage.removeItem("woolf_welcome_back_shown");
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
