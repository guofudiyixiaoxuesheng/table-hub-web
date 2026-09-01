import { apiFetch } from "@/lib/api/client";
import type { GameSessionStatus } from "@/lib/game-sessions/game-session-api";
import type { KnowledgeDocumentListItem, ScriptGenre } from "@/lib/oss/knowledge-resource-types";

export type PublicStore = {
  id: string;
  name: string;
  createdAt: string;
};

export type PublicScript = {
  id: string;
  storeId: string;
  name: string;
  description?: string | null;
  scriptGenre?: ScriptGenre | null;
  tags: string[];
  updatedAt: string;
};

export type PublicGameSession = {
  id: string;
  storeId: string;
  scriptDocumentId?: string | null;
  title: string;
  scriptName: string;
  startTime: string;
  durationMinutes: number;
  minPlayers: number;
  capacity: number;
  joinedSeats: number;
  remainingSeats?: number;
  priceCents: number;
  status: GameSessionStatus;
  description?: string | null;
  dmName?: string | null;
};

export type PublicListParams = {
  keyword?: string;
  day?: string;
  status?: GameSessionStatus;
  scriptDocumentId?: string;
  scriptGenre?: ScriptGenre;
  storeId?: string;
};

function buildSearch(params: Record<string, string | number | boolean | null | undefined> = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getPublicStore(storeId?: string) {
  void storeId;
  return Promise.resolve(null);
}

function toPublicScript(item: KnowledgeDocumentListItem): PublicScript {
  return {
    id: item.id,
    storeId: "",
    name: item.name,
    description: item.description,
    scriptGenre: item.scriptGenre,
    tags: item.tags,
    updatedAt: item.updatedAt,
  };
}

export async function listPublicScripts(params: PublicListParams = {}) {
  const data = await apiFetch<KnowledgeDocumentListItem[]>(
    `/api/v1/knowledge/documents${buildSearch({ ...params, resourceType: "script" })}`,
  );
  return data.map(toPublicScript);
}

export function listPublicGameSessions(params: PublicListParams = {}) {
  return apiFetch<PublicGameSession[]>(`/api/v1/game-sessions${buildSearch(params)}`);
}

export function getPublicGameSession(id: string, storeId?: string) {
  return apiFetch<PublicGameSession>(`/api/v1/game-sessions/${id}${buildSearch({ storeId })}`);
}
