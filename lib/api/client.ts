import type { ApiEnvelope, AuthSession } from "@/lib/auth/types";
import { getAccessToken, setAccessToken } from "@/lib/auth/token-store";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
  ?? (typeof window === "undefined"
    ? "http://localhost:8000"
    : `${window.location.protocol}//${window.location.hostname}:8000`);

let refreshRequest: Promise<AuthSession> | null = null;
const DEFAULT_TIMEOUT_MS = 12000;

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  if (options.signal) return fetch(input, options);
  const controller = new AbortController();
  const setTimer = typeof window === "undefined" ? globalThis.setTimeout : window.setTimeout;
  const clearTimer = typeof window === "undefined" ? globalThis.clearTimeout : window.clearTimeout;
  const timer = setTimer(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...options, signal: controller.signal });
  } finally {
    clearTimer(timer);
  }
}

async function parseEnvelope<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok) throw new Error(body?.message || `请求失败：HTTP ${response.status}`);
  return body?.data as T;
}

async function parseFullEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok) throw new Error(body?.message || `请求失败：HTTP ${response.status}`);
  if (!body) throw new Error("接口响应为空");
  return body;
}

export async function refreshSession(): Promise<AuthSession> {
  if (!refreshRequest) {
    refreshRequest = fetchWithTimeout(`${API_BASE_URL}/api/v1/auth/refresh`, {
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

  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
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

export async function apiFetchEnvelope<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<ApiEnvelope<T>> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });
  if (response.status === 401 && retry && path !== "/api/v1/auth/refresh") {
    try {
      await refreshSession();
      return apiFetchEnvelope<T>(path, options, false);
    } catch {
      setAccessToken(null);
      if (typeof window !== "undefined") window.dispatchEvent(new Event("tablehub:unauthorized"));
    }
  }
  return parseFullEnvelope<T>(response);
}
