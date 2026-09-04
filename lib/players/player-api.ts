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

export type PlayerBehaviorSession = {
  session_id: string;
  title: string;
  script_name: string;
  script_genre: string | null;
  start_time: string;
  duration_minutes: number;
  capacity: number;
  joined_seats: number;
  price_cents: number;
  cover_image_url: string | null;
  join_status: string;
  reservation_code: string;
  source: string;
  seat_count: number;
  joined_at: string;
  updated_at: string;
};

export type PlayerBehaviorSummary = {
  store_player: StorePlayer;
  reservation_count: number;
  completed_count: number;
  cancelled_count: number;
  active_reservation_count: number;
  cancellation_rate: number;
  estimated_spend_cents: number;
  favorite_genres: string[];
  recent_sessions: PlayerBehaviorSession[];
  ai_summary: string;
};

export type StorePlayerAnalytics = {
  total_players: number;
  reservation_count: number;
  completed_count: number;
  cancelled_count: number;
  active_reservation_count: number;
  cancellation_rate: number;
  estimated_revenue_cents: number;
  top_genres: Array<{ genre: string; count: number }>;
  active_players: Array<Record<string, unknown>>;
  risk_players: Array<Record<string, unknown>>;
  ai_summary: string;
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

export function getPlayerBehavior(id: string) {
  return apiFetch<PlayerBehaviorSummary>(`/api/v1/players/${id}/behavior`);
}

export function getMyPlayerBehavior() {
  return apiFetch<PlayerBehaviorSummary | null>("/api/v1/players/me/behavior");
}

export function getPlayerAnalytics() {
  return apiFetch<StorePlayerAnalytics>("/api/v1/players/analytics/summary");
}
