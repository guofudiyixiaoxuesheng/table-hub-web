import { apiFetch, apiFetchEnvelope } from "@/lib/api/client";

export type StorePlayer = {
  id: string;
  user_id: string;
  phone: string | null;
  nickname: string | null;
  avatar_url: string | null;
  preference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type StorePlayerPayload = {
  phone: string;
  password?: string;
  nickname?: string | null;
  avatar_url?: string | null;
  preference?: string | null;
  notes?: string | null;
};

export async function listPlayers(params: { keyword?: string; page?: number; pageSize?: number } = {}) {
  const search = new URLSearchParams();
  if (params.keyword) search.set("keyword", params.keyword);
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  const envelope = await apiFetchEnvelope<StorePlayer[]>(`/api/v1/players?${search.toString()}`);
  return {
    items: envelope.data,
    meta: {
      total: Number(envelope.meta?.total ?? envelope.data.length),
      page: Number(envelope.meta?.page ?? params.page ?? 1),
      pageSize: Number(envelope.meta?.pageSize ?? params.pageSize ?? 20),
    },
  };
}

export function createPlayer(payload: StorePlayerPayload) {
  return apiFetch<StorePlayer>("/api/v1/players", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updatePlayer(id: string, payload: Partial<StorePlayerPayload>) {
  return apiFetch<StorePlayer>(`/api/v1/players/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deletePlayer(id: string) {
  return apiFetch<void>(`/api/v1/players/${id}`, { method: "DELETE" });
}
