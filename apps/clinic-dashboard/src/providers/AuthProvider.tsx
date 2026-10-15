"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";

export interface UserSession {
  id: string;
  email: string;
  role: "ADMIN" | "RECEPTIONIST" | "DOCTOR" | "PATIENT";
  profile?: any;
}

interface AuthContextType {
  user: UserSession | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isDoctor: boolean;
  isReceptionist: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function initAuth() {
      const savedUser = localStorage.getItem("kumar_staff_user");
      const token = localStorage.getItem("kumar_staff_token");

      if (token && savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser({
            id: parsed.user_id,
            email: parsed.email || "",
            role: parsed.role,
            profile: parsed.profile,
          });

          // Verify with server
          const me = await api.getMe();
          setUser({
            id: me.id,
            email: me.email,
            role: me.role,
            profile: me.profile,
          });
        } catch {
          api.clearAuthToken();
          setUser(null);
        }
      }
      setIsLoading(false);
    }
    initAuth();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const isLoginPage = pathname === "/login";
      if (!user && !isLoginPage) {
        router.push("/login");
      } else if (user && isLoginPage) {
        router.push("/dashboard");
      }
    }
  }, [user, isLoading, pathname, router]);

  const login = async (email: string, password: string) => {
    const authData = await api.staffLogin(email, password);
    setUser({
      id: authData.user_id,
      email,
      role: authData.role,
      profile: authData.profile,
    });
    router.push("/dashboard");
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    router.push("/login");
  };

  const isAdmin = user?.role === "ADMIN";
  const isDoctor = user?.role === "DOCTOR" || user?.role === "ADMIN";
  const isReceptionist = user?.role === "RECEPTIONIST" || user?.role === "ADMIN";

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAdmin,
        isDoctor,
        isReceptionist,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
