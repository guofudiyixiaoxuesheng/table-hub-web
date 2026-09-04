import { apiFetch } from "@/lib/api/client";

export type ScriptMarketingPurpose = "script_profile" | "session_fill" | "cover_and_detail";

export type ScriptMarketingGeneratePayload = {
  purpose?: ScriptMarketingPurpose;
  tone?: string;
  avoidSpoilers?: boolean;
  extraRequirement?: string | null;
};

export type ScriptMarketingAssetResult = {
  documentId: string;
  versionId?: string | null;
  assetId?: string | null;
  versionNo?: number | null;
  status?: "draft" | "approved" | string;
  managerFeedback?: string | null;
  title: string;
  summary: string;
  sellingPoints: string[];
  suitablePlayers: string[];
  tags: string[];
  coverPrompt: string;
  coverImageUrl?: string | null;
  detailCopy: string;
  detailImagePrompts: string[];
  detailImageUrls?: string[];
  imageStatus?: "not_started" | "generating" | "ready" | "failed" | string;
  imageErrorMessage?: string | null;
  riskNotes: string[];
  sources: string[];
  createdAt?: string | null;
  approvedAt?: string | null;
};

const SCRIPT_MARKETING_TIMEOUT_MS = 180_000;

export function generateScriptMarketingAssets(documentId: string, payload: ScriptMarketingGeneratePayload) {
  return apiFetch<ScriptMarketingAssetResult>(`/api/v1/script-marketing/${documentId}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, true, SCRIPT_MARKETING_TIMEOUT_MS);
}

export function listScriptMarketingAssets(documentId: string, status?: "draft" | "approved") {
  const search = status ? `?status=${status}` : "";
  return apiFetch<ScriptMarketingAssetResult[]>(`/api/v1/script-marketing/${documentId}${search}`);
}

export function approveScriptMarketingAsset(assetId: string, managerFeedback?: string | null) {
  return apiFetch<ScriptMarketingAssetResult>(`/api/v1/script-marketing/assets/${assetId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ managerFeedback }),
  });
}

export function generateScriptMarketingImages(
  assetId: string,
  payload: { includeCover?: boolean; includeDetail?: boolean; promptOverride?: string | null },
) {
  return apiFetch<ScriptMarketingAssetResult>(`/api/v1/script-marketing/assets/${assetId}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, true, SCRIPT_MARKETING_TIMEOUT_MS);
}
