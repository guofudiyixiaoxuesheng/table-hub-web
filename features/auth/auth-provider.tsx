"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isPublicPath } from "@/config/access";
import { API_BASE_URL, fetchWithTimeout, refreshSession } from "@/lib/api/client";
import { apiFetch } from "@/lib/api/client";
import { setAccessToken } from "@/lib/auth/token-store";
import type { ApiEnvelope, AuthSession, AuthUser } from "@/lib/auth/types";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (values: {
    phone: string;
    password: string;
    nickname: string;
    registrationType: "user" | "store" | "dm";
    storeName?: string;
    inviteCode?: string;
  }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function parseSession(response: Response): Promise<AuthSession> {
  const body = (await response.json().catch(() => null)) as ApiEnvelope<AuthSession> | null;
  if (!response.ok) throw new Error(body?.message || "登录失败");
  return body?.data as AuthSession;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    refreshSession()
      .then((session) => setUser(session.user))
      .catch(() => setAccessToken(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user && pathname !== "/login" && !isPublicPath(pathname)) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, pathname, router, user]);

  useEffect(() => {
    const unauthorized = () => {
      setAccessToken(null);
      setUser(null);
    };
    window.addEventListener("tablehub:unauthorized", unauthorized);
    return () => window.removeEventListener("tablehub:unauthorized", unauthorized);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    login: async (phone, password) => {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const session = await parseSession(response);
      setAccessToken(session.accessToken);
      setUser(session.user);
    },
    register: async (values) => {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const session = await parseSession(response);
      setAccessToken(session.accessToken);
      setUser(session.user);
    },
    changePassword: async (currentPassword, newPassword) => {
      await apiFetch<void>("/api/v1/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setAccessToken(null);
      setUser(null);
      router.replace("/login");
    },
    logout: async () => {
      await fetchWithTimeout(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      setAccessToken(null);
      setUser(null);
      router.replace("/login");
    },
  }), [loading, router, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth 必须在 AuthProvider 内使用");
  return context;
}
