import { apiFetch } from "@/lib/api/client";

export type CharacterVisual = Partial<{
  name: string;
  publicIdentity: string;
  gender: string;
  outfit: string;
  props: string[];
  emotionKeywords: string[];
  visualPrompt: string;
  spoilerLevel: string;
}>;

export type ScriptVisualProfileResult = {
  id: string;
  documentId: string;
  scriptProfileId?: string | null;
  name: string;
  era?: string | null;
  worldSetting?: string | null;
  mainScenes: string[];
  visualSymbols: string[];
  colorPalette: string[];
  atmosphereKeywords: string[];
  characterVisuals: CharacterVisual[];
  spoilerSafeRules: string[];
  copyrightSafeRules: string[];
  referenceImageUrls: string[];
  confidenceScore?: number | null;
  status: "draft" | "ready" | "failed" | "approved" | string;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
};

export type VisualStylePresetResult = {
  id: string;
  name: string;
  styleType: string;
  description?: string | null;
  promptTemplate: string;
  negativePrompt?: string | null;
  recommendedAspectRatios: string[];
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
};

export type GenerateScriptVisualProfilePayload = {
  referenceImageUrls?: string[];
  extraRequirement?: string | null;
};

export type GenerateScriptVisualAssetPayload = {
  visualProfileId?: string | null;
  stylePresetId?: string | null;
  usageType?: string;
  usageLabel?: string;
  aspectRatio?: string;
  count?: number;
  extraRequirement?: string | null;
};

export type ScriptVisualAssetResult = {
  id: string;
  documentId: string;
  visualProfileId?: string | null;
  stylePresetId?: string | null;
  usageType: string;
  usageLabel: string;
  prompt: string;
  negativePrompt?: string | null;
  aspectRatio: string;
  objectKey?: string | null;
  imageUrl?: string | null;
  status: "draft" | "ready" | "failed" | "selected" | string;
  errorMessage?: string | null;
  isSelected: boolean;
  selectedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

const SCRIPT_VISUAL_TIMEOUT_MS = 180_000;

export function listVisualStylePresets() {
  return apiFetch<VisualStylePresetResult[]>("/api/v1/script-visual/style-presets");
}

export function getScriptVisualProfile(documentId: string) {
  return apiFetch<ScriptVisualProfileResult | null>(`/api/v1/script-visual/${documentId}/profile`);
}

export function generateScriptVisualProfile(documentId: string, payload: GenerateScriptVisualProfilePayload) {
  return apiFetch<ScriptVisualProfileResult>(
    `/api/v1/script-visual/${documentId}/profile/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    true,
    SCRIPT_VISUAL_TIMEOUT_MS,
  );
}

export function approveScriptVisualProfile(profileId: string) {
  return apiFetch<ScriptVisualProfileResult>(`/api/v1/script-visual/profiles/${profileId}/approve`, {
    method: "POST",
  });
}

export function listScriptVisualAssets(documentId: string, usageType?: string) {
  const search = usageType ? `?usage_type=${encodeURIComponent(usageType)}` : "";
  return apiFetch<ScriptVisualAssetResult[]>(`/api/v1/script-visual/${documentId}/assets${search}`);
}

export function generateScriptVisualAssets(documentId: string, payload: GenerateScriptVisualAssetPayload) {
  return apiFetch<ScriptVisualAssetResult[]>(
    `/api/v1/script-visual/${documentId}/assets/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    true,
    SCRIPT_VISUAL_TIMEOUT_MS,
  );
}

export function selectScriptVisualAsset(assetId: string) {
  return apiFetch<ScriptVisualAssetResult>(`/api/v1/script-visual/assets/${assetId}/select`, {
    method: "POST",
  });
}

export function generateScriptVisualAssetImage(assetId: string) {
  return apiFetch<ScriptVisualAssetResult>(
    `/api/v1/script-visual/assets/${assetId}/generate-image`,
    { method: "POST" },
    true,
    SCRIPT_VISUAL_TIMEOUT_MS,
  );
}

export function deleteScriptVisualAsset(assetId: string) {
  return apiFetch<void>(`/api/v1/script-visual/assets/${assetId}`, {
    method: "DELETE",
  });
}
