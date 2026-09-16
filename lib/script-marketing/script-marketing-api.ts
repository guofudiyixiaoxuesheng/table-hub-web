import { apiFetch } from "@/lib/api/client";

export type ScriptMarketingPurpose = "script_profile" | "session_fill" | "cover_and_detail";

export type ScriptMarketingGeneratePayload = {
  purpose?: ScriptMarketingPurpose;
  tone?: string;
  avoidSpoilers?: boolean;
  extraRequirement?: string | null;
  usageType?: string;
  usageLabel?: string;
  styleProfileId?: string | null;
};

export type ScriptMarketingGenerationTask = {
  documentId: string;
  status: "generating" | string;
};

export type ScriptMarketingSessionFormDefaults = Partial<{
  title: string;
  description: string;
  durationMinutes: number;
  capacity: number;
  minPlayers: number;
  priceYuan: number;
  notes: string;
}>;

export type ScriptMarketingPlayerCard = Partial<{
  title: string;
  subtitle: string;
  summary: string;
  coverPrompt: string;
  coverImageUrl: string;
}>;

export type ScriptMarketingPlayerDetail = Partial<{
  detailCopy: string;
  imagePrompts: string[];
  imageUrls: string[];
}>;

export type ScriptMarketingMoments = Partial<{
  copy: string;
  posterTitle: string;
  posterSubtitle: string;
  posterPrompt: string;
  posterImageUrl: string;
}>;

export type ScriptMarketingImageGeneration = {
  id: string;
  status: "generating" | "ready" | "failed" | string;
  includeCover?: boolean;
  includeDetail?: boolean;
  createdAt?: string;
  finishedAt?: string;
  coverImageUrl?: string | null;
  detailImageUrls?: string[];
  finalImagePrompts?: { cover?: string | null; details?: string[]; styleProfileId?: string | null };
  errorMessage?: string | null;
};

export type ScriptMarketingImageResult = {
  id: string;
  documentId: string;
  sourceAssetId?: string | null;
  sourceVersionNo?: number | null;
  sourceTitle?: string | null;
  imageKind: "cover" | "detail" | string;
  status: "generating" | "ready" | "failed" | string;
  imageUrl?: string | null;
  finalPrompt?: string | null;
  errorMessage?: string | null;
  createdAt?: string | null;
};

export type ScriptMarketingAssetResult = {
  documentId: string;
  versionId?: string | null;
  assetId?: string | null;
  versionNo?: number | null;
  usageType?: string;
  usageLabel?: string;
  status?: "draft" | "approved" | string;
  managerFeedback?: string | null;
  title: string;
  summary: string;
  sellingPoints: string[];
  suitablePlayers: string[];
  tags: string[];
  coverPrompt: string;
  styleProfileId?: string | null;
  finalImagePrompts?: { cover?: string | null; details?: string[]; styleProfileId?: string | null };
  coverImageUrl?: string | null;
  detailCopy: string;
  detailImagePrompts: string[];
  detailImageUrls?: string[];
  sessionFormDefaults?: ScriptMarketingSessionFormDefaults;
  playerCard?: ScriptMarketingPlayerCard;
  playerDetail?: ScriptMarketingPlayerDetail;
  moments?: ScriptMarketingMoments;
  imageStatus?: "not_started" | "generating" | "ready" | "failed" | string;
  imageErrorMessage?: string | null;
  imageGenerations?: ScriptMarketingImageGeneration[];
  riskNotes: string[];
  sources: string[];
  createdAt?: string | null;
  approvedAt?: string | null;
};

const SCRIPT_MARKETING_TIMEOUT_MS = 180_000;

export function generateScriptMarketingAssets(documentId: string, payload: ScriptMarketingGeneratePayload) {
  return apiFetch<ScriptMarketingGenerationTask>(`/api/v1/script-marketing/${documentId}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, true, SCRIPT_MARKETING_TIMEOUT_MS);
}

export function listScriptMarketingAssets(documentId: string, status?: "draft" | "approved") {
  const search = status ? `?status=${status}` : "";
  return apiFetch<ScriptMarketingAssetResult[]>(`/api/v1/script-marketing/${documentId}${search}`);
}

export function listScriptMarketingImages(documentId: string) {
  return apiFetch<ScriptMarketingImageResult[]>(`/api/v1/script-marketing/${documentId}/images`);
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
  payload: { includeCover?: boolean; includeDetail?: boolean; promptOverride?: string | null; styleProfileId?: string | null },
) {
  console.log("generateScriptMarketingImages", assetId, payload);
  return apiFetch<ScriptMarketingAssetResult>(`/api/v1/script-marketing/assets/${assetId}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, true, SCRIPT_MARKETING_TIMEOUT_MS);
}
