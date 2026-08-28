import type { ApiEnvelope, AuthSession } from "@/lib/auth/types";
import { getAccessToken, setAccessToken } from "@/lib/auth/token-store";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
  ?? (typeof window === "undefined"
    ? "http://localhost:8000"
    : `${window.location.protocol}//${window.location.hostname}:8000`);

let refreshRequest: Promise<AuthSession> | null = null;

async function parseEnvelope<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok) throw new Error(body?.message || `请求失败：HTTP ${response.status}`);
  return body?.data as T;
}

export async function refreshSession(): Promise<AuthSession> {
  if (!refreshRequest) {
    refreshRequest = fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then(parseEnvelope<AuthSession>)
      .then((session) => {
        setAccessToken(session.accessToken);
        return session;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }
  return refreshRequest;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });
  if (response.status === 401 && retry && path !== "/api/v1/auth/refresh") {
    try {
      await refreshSession();
      return apiFetch<T>(path, options, false);
    } catch {
      setAccessToken(null);
      if (typeof window !== "undefined") window.dispatchEvent(new Event("tablehub:unauthorized"));
    }
  }
  return parseEnvelope<T>(response);
}
