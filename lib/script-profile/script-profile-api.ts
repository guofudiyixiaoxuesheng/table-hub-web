import { apiFetch } from "@/lib/api/client";

export type ScriptProfileResult = {
  id: string;
  documentId: string;
  versionId: string | null;
  name: string;
  aliasNames: string[];
  genres: string[];
  playerCountMin: number | null;
  playerCountMax: number | null;
  durationMinutes: number | null;
  difficulty: string | null;
  dmDifficulty: string | null;
  summary: string | null;
  storyBackground: string | null;
  truthSummary: string | null;
  sellingPoints: string[];
  suitablePlayers: string[];
  coreMechanics: string[];
  roles: Record<string, unknown>[];
  materialChecklist: string[];
  openingRisks: string[];
  spoilerNotes: string[];
  sourceChunkIds: string[];
  sources: string[];
  confidenceScore: number | null;
  reviewStatus: "draft" | "needs_review" | "approved" | "failed" | string;
  errorMessage: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ScriptProfileGeneratePayload = {
  extraRequirement?: string | null;
};

export type ScriptProfileUpdatePayload = Partial<{
  name: string;
  aliasNames: string[];
  genres: string[];
  playerCountMin: number | null;
  playerCountMax: number | null;
  durationMinutes: number | null;
  difficulty: string | null;
  dmDifficulty: string | null;
  summary: string | null;
  storyBackground: string | null;
  truthSummary: string | null;
  sellingPoints: string[];
  suitablePlayers: string[];
  coreMechanics: string[];
  roles: Record<string, unknown>[];
  materialChecklist: string[];
  openingRisks: string[];
  spoilerNotes: string[];
}>;

export function getScriptProfileByDocument(documentId: string) {
  return apiFetch<ScriptProfileResult | null>(`/api/v1/script-profiles/by-document/${documentId}`);
}

export function generateScriptProfile(documentId: string, payload: ScriptProfileGeneratePayload = {}) {
  return apiFetch<ScriptProfileResult>(
    `/api/v1/script-profiles/${documentId}/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    true,
    120000,
  );
}

export function updateScriptProfile(profileId: string, payload: ScriptProfileUpdatePayload) {
  return apiFetch<ScriptProfileResult>(`/api/v1/script-profiles/${profileId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function approveScriptProfile(profileId: string) {
  return apiFetch<ScriptProfileResult>(`/api/v1/script-profiles/${profileId}/approve`, {
    method: "POST",
  });
}

export function deleteScriptProfile(profileId: string) {
  return apiFetch<void>(`/api/v1/script-profiles/${profileId}`, {
    method: "DELETE",
  });
}
