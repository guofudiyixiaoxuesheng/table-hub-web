import { apiFetch } from "@/lib/api/client";

export type GameSessionStatus = "recruiting" | "full" | "cancelled" | "completed";
export type SessionPlayerStatus = "pending" | "confirmed" | "cancelled";
export type SessionJoinSource = "h5" | "manual" | "wechat_chat";
export type GameSessionImageSource = "manual" | "knowledge_asset" | "ai_generated";

export type ScriptOption = {
  id: string;
  name: string;
  scriptGenre: string | null;
  description: string | null;
};

export type DmOption = {
  id: string;
  nickname: string | null;
  phone: string | null;
};

export type Room = {
  id: string;
  storeId: string;
  name: string;
  capacity: number;
  location: string | null;
  status: "active" | "disabled" | string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RoomPayload = {
  name: string;
  capacity: number;
  location?: string | null;
  status?: "active" | "disabled";
  notes?: string | null;
};

export type SessionImageAssetOption = {
  id: string;
  label: string;
  previewUrl: string;
  relativePath: string | null;
  pageNumber: number | null;
};

export type SessionPlayer = {
  id: string;
  sessionId: string;
  userId: string | null;
  playerName: string;
  phone: string | null;
  seatCount: number;
  reservationCode: string;
  source: SessionJoinSource;
  status: SessionPlayerStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GameSession = {
  id: string;
  storeId: string;
  scriptDocumentId: string | null;
  dmUserId: string | null;
  roomId: string | null;
  roomName: string | null;
  title: string;
  scriptName: string;
  startTime: string;
  durationMinutes: number;
  minPlayers: number;
  capacity: number;
  priceCents: number;
  status: GameSessionStatus;
  description: string | null;
  notes: string | null;
  coverImageSource: GameSessionImageSource | null;
  coverImageAssetId: string | null;
  coverImageUrl: string | null;
  detailImageSource: GameSessionImageSource | null;
  detailImageAssetIds: string[];
  detailImageUrls: string[];
  joinedSeats: number;
  playerCount: number;
  dmName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GameSessionDetail = GameSession & {
  players: SessionPlayer[];
};

export type GameSessionPayload = {
  scriptDocumentId?: string | null;
  dmUserId?: string | null;
  roomId?: string | null;
  title: string;
  scriptName: string;
  startTime: string;
  durationMinutes: number;
  minPlayers: number;
  capacity: number;
  priceCents: number;
  description?: string | null;
  notes?: string | null;
  coverImageSource?: GameSessionImageSource | null;
  coverImageAssetId?: string | null;
  coverImageUrl?: string | null;
  detailImageSource?: GameSessionImageSource | null;
  detailImageAssetIds?: string[];
  detailImageUrls?: string[];
  status?: GameSessionStatus;
};

export type SessionPlayerPayload = {
  userId?: string | null;
  playerName: string;
  phone?: string | null;
  seatCount: number;
  source: SessionJoinSource;
  status: SessionPlayerStatus;
  notes?: string | null;
};

export type GameSessionListParams = {
  keyword?: string;
  day?: string;
  status?: GameSessionStatus;
  scriptDocumentId?: string;
  roomId?: string;
};

export function listGameSessions(params: GameSessionListParams = {}) {
  const search = new URLSearchParams();
  if (params.keyword) search.set("keyword", params.keyword);
  if (params.day) search.set("day", params.day);
  if (params.status) search.set("status", params.status);
  if (params.scriptDocumentId) search.set("scriptDocumentId", params.scriptDocumentId);
  if (params.roomId) search.set("roomId", params.roomId);
  return apiFetch<GameSession[]>(`/api/v1/game-sessions?${search.toString()}`);
}

export function listRooms(includeDisabled = true) {
  return apiFetch<Room[]>(`/api/v1/game-sessions/rooms?includeDisabled=${includeDisabled}`);
}

export function createRoom(payload: RoomPayload) {
  return apiFetch<Room>("/api/v1/game-sessions/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateRoom(id: string, payload: RoomPayload) {
  return apiFetch<Room>(`/api/v1/game-sessions/rooms/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteRoom(id: string) {
  return apiFetch<void>(`/api/v1/game-sessions/rooms/${id}`, { method: "DELETE" });
}

export function getGameSession(id: string) {
  return apiFetch<GameSessionDetail>(`/api/v1/game-sessions/${id}`);
}

export function createGameSession(payload: GameSessionPayload) {
  return apiFetch<GameSessionDetail>("/api/v1/game-sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateGameSession(id: string, payload: GameSessionPayload) {
  return apiFetch<GameSessionDetail>(`/api/v1/game-sessions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteGameSession(id: string) {
  return apiFetch<void>(`/api/v1/game-sessions/${id}`, { method: "DELETE" });
}

export function cancelGameSession(id: string) {
  return apiFetch<GameSessionDetail>(`/api/v1/game-sessions/${id}/cancel`, { method: "POST" });
}

export function addSessionPlayer(sessionId: string, payload: SessionPlayerPayload) {
  return apiFetch<SessionPlayer>(`/api/v1/game-sessions/${sessionId}/players`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateSessionPlayer(sessionId: string, playerId: string, payload: SessionPlayerPayload) {
  return apiFetch<SessionPlayer>(`/api/v1/game-sessions/${sessionId}/players/${playerId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteSessionPlayer(sessionId: string, playerId: string) {
  return apiFetch<void>(`/api/v1/game-sessions/${sessionId}/players/${playerId}`, { method: "DELETE" });
}

export function listScriptOptions(keyword?: string) {
  const search = new URLSearchParams();
  if (keyword) search.set("keyword", keyword);
  return apiFetch<ScriptOption[]>(`/api/v1/game-sessions/script-options?${search.toString()}`);
}

export function listDmOptions() {
  return apiFetch<DmOption[]>("/api/v1/game-sessions/dm-options");
}

export function listScriptImageOptions(scriptDocumentId: string) {
  const search = new URLSearchParams({ scriptDocumentId });
  return apiFetch<SessionImageAssetOption[]>(`/api/v1/game-sessions/script-image-options?${search.toString()}`);
}
