import { apiFetch } from "@/lib/api/client";

export type OpeningManualGeneratePayload = {
  style?: "professional" | "simple" | "training";
  targetDmLevel?: "newbie" | "experienced";
  extraRequirement?: string | null;
};

export type OpeningManualSection = {
  key: string;
  title: string;
  summary: string;
  sourceCount: number;
};

export type OpeningManualResult = {
  id: string;
  documentId: string;
  versionId?: string | null;
  manualVersionNo: number;
  title: string;
  style: string;
  targetDmLevel: string;
  status: "draft" | "generating" | "ready" | "failed" | "approved" | string;
  sections: OpeningManualSection[];
  sources: string[];
  markdownPreview?: string | null;
  markdown?: string | null;
  validationResult: Record<string, unknown>;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
};

const OPENING_MANUAL_TIMEOUT_MS = 120_000;

export function generateOpeningManual(documentId: string, payload: OpeningManualGeneratePayload) {
  return apiFetch<OpeningManualResult>(`/api/v1/script-opening-manuals/${documentId}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, true, OPENING_MANUAL_TIMEOUT_MS);
}

export function listOpeningManuals(documentId: string) {
  return apiFetch<OpeningManualResult[]>(`/api/v1/script-opening-manuals/${documentId}`);
}

export function getOpeningManual(manualId: string) {
  return apiFetch<OpeningManualResult>(`/api/v1/script-opening-manuals/manuals/${manualId}`);
}

export function deleteOpeningManual(manualId: string) {
  return apiFetch<null>(`/api/v1/script-opening-manuals/manuals/${manualId}`, {
    method: "DELETE",
  });
}
