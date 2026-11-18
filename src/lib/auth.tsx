import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDemoMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; user: User | null; session: Session | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  signInDemo: () => void;
  exitDemo: () => void;
}

const DEMO_USER: User = {
  id: "u0000000-0000-0000-0000-000000000001",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { full_name: "خضر مأمون" },
  aud: "authenticated",
  confirmation_sent_at: new Date().toISOString(),
  recovery_sent_at: undefined,
  email_change_sent_at: undefined,
  new_email: undefined,
  invited_at: undefined,
  action_link: undefined,
  email: "khdrmamon@gmail.com",
  phone: "+249912345678",
  created_at: new Date().toISOString(),
  confirmed_at: new Date().toISOString(),
  email_confirmed_at: new Date().toISOString(),
  phone_confirmed_at: undefined,
  last_sign_in_at: new Date().toISOString(),
  role: "authenticated",
  updated_at: new Date().toISOString(),
  identities: [],
  factors: [],
};

const DEMO_SESSION: Session = {
  access_token: "mock-demo-token",
  refresh_token: "mock-demo-refresh",
  expires_in: 3600 * 24 * 7,
  expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
  token_type: "bearer",
  user: DEMO_USER,
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("finora_demo_mode") === "true";
    }
    return false;
  });

  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== "undefined" && localStorage.getItem("finora_demo_mode") === "true") {
      return DEMO_USER;
    }
    return null;
  });

  const [session, setSession] = useState<Session | null>(() => {
    if (typeof window !== "undefined" && localStorage.getItem("finora_demo_mode") === "true") {
      return DEMO_SESSION;
    }
    return null;
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      setUser(DEMO_USER);
      setSession(DEMO_SESSION);
      setLoading(false);
      return;
    }

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isDemoMode) {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isDemoMode]);

  const signIn = async (email: string, password: string) => {
    // If logging into real account, exit demo mode
    if (isDemoMode) {
      exitDemo();
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (isDemoMode) {
      exitDemo();
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    return { error: error as Error | null, user: data?.user ?? null, session: data?.session ?? null };
  };

  const signOut = async () => {
    if (isDemoMode) {
      exitDemo();
    } else {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
  };

  const signInDemo = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("finora_demo_mode", "true");
    }
    setIsDemoMode(true);
    setUser(DEMO_USER);
    setSession(DEMO_SESSION);
    setLoading(false);
  };

  const exitDemo = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("finora_demo_mode");
    }
    setIsDemoMode(false);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined,
    });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isDemoMode,
        signIn,
        signUp,
        signOut,
        resetPassword,
        signInDemo,
        exitDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
