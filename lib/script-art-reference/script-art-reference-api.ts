import { apiFetch, apiFetchEnvelope, fetchWithTimeout } from "@/lib/api/client";

export type TaxonomyOption = {
  label: string;
  value: string;
  description: string;
};

export type ArtReferenceTaxonomy = {
  scriptTags: TaxonomyOption[];
  usageTypes: TaxonomyOption[];
  styleTypes: TaxonomyOption[];
  eraTypes: TaxonomyOption[];
  regionTypes: TaxonomyOption[];
  moodTypes: TaxonomyOption[];
  compositionTypes: TaxonomyOption[];
  aliases: Record<string, Record<string, string>>;
};

export type ArtReferenceImage = {
  id: string;
  packageId: string;
  clientFileId: string;
  usageType: string;
  styleType: string;
  eraType: string;
  moodTypes: string[];
  compositionTypes: string[];
  fileName: string;
  relativePath: string;
  contentType: string;
  size: number;
  objectKey: string;
  imageUrl?: string | null;
  caption?: string | null;
  analysisJson: Record<string, unknown>;
  status: string;
  errorMessage?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ArtReferencePackage = {
  id: string;
  storeId: string;
  documentId?: string | null;
  title: string;
  scriptName: string;
  scriptSummary?: string | null;
  scriptTags: string[];
  eraType: string;
  dominantStyleType: string;
  regionType: string;
  moodTypes: string[];
  copyrightScope: string;
  copyrightNote?: string | null;
  status: string;
  analysisJson: Record<string, unknown>;
  promptBriefJson: Record<string, unknown>;
  imageCount: number;
  uploadedImageCount: number;
  createdAt: string;
  updatedAt: string;
  images: ArtReferenceImage[];
};

export type CreateArtReferenceImageInput = {
  clientFileId: string;
  fileName: string;
  relativePath: string;
  contentType: string;
  size: number;
  usageType?: string;
  styleType?: string;
  eraType?: string;
  moodTypes?: string[];
  compositionTypes?: string[];
  sortOrder?: number;
};

export type CreateArtReferencePackagePayload = {
  documentId?: string | null;
  title: string;
  scriptName: string;
  scriptSummary?: string | null;
  scriptTags: string[];
  eraType: string;
  dominantStyleType: string;
  regionType: string;
  moodTypes: string[];
  copyrightScope?: string;
  copyrightNote?: string | null;
  images: CreateArtReferenceImageInput[];
};

export type ArtReferenceUploadTarget = {
  clientFileId: string;
  objectKey: string;
  uploadUrl: string;
  headers: Record<string, string>;
};

export type CreateArtReferencePackageResponse = {
  package: ArtReferencePackage;
  uploadTargets: ArtReferenceUploadTarget[];
};

export type ArtReferencePackageListResult = {
  items: ArtReferencePackage[];
  total: number;
};

export type ArtReferenceStyleProfile = {
  id: string;
  storeId: string;
  name: string;
  samplePackageIds: string[];
  sampleCount: number;
  filterSnapshot: Record<string, unknown>;
  analysisJson: Record<string, unknown>;
  promptTemplate: string;
  negativePrompt?: string | null;
  status: string;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListArtReferencePackagesParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  styleType?: string;
  eraType?: string;
  regionType?: string;
  scriptTag?: string;
  moodType?: string;
  status?: string;
};

export async function getArtReferenceTaxonomy() {
  return apiFetch<ArtReferenceTaxonomy>("/api/v1/script-art-references/taxonomy");
}

export async function listArtReferenceStyleProfiles() {
  return apiFetch<ArtReferenceStyleProfile[]>("/api/v1/script-art-references/style-profiles");
}

export async function createArtReferenceStyleProfile(payload: {
  packageIds: string[];
  name?: string;
  filterSnapshot?: Record<string, unknown>;
}) {
  return apiFetch<ArtReferenceStyleProfile>("/api/v1/script-art-references/style-profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  // 视觉规律提炼会汇总多套素材的 caption，普通 12 秒超时不适用。
  }, true, 300000);
}

export async function analyzeArtReferenceImages(packageIds: string[], maxImages = 300) {
  return apiFetch<{ queuedImageCount: number }>("/api/v1/script-art-references/images/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ packageIds, maxImages }),
  // 接口只负责入队，实际视觉分析在后台运行。
  }, true, 30000);
}

export async function listArtReferencePackages(params: ListArtReferencePackagesParams = {}): Promise<ArtReferencePackageListResult> {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 1));
  search.set("pageSize", String(params.pageSize ?? 20));
  if (params.keyword) search.set("keyword", params.keyword);
  if (params.styleType) search.set("styleType", params.styleType);
  if (params.eraType) search.set("eraType", params.eraType);
  if (params.regionType) search.set("regionType", params.regionType);
  if (params.scriptTag) search.set("scriptTag", params.scriptTag);
  if (params.moodType) search.set("moodType", params.moodType);
  if (params.status) search.set("status", params.status);
  const envelope = await apiFetchEnvelope<ArtReferencePackage[]>(`/api/v1/script-art-references/packages?${search.toString()}`);
  return {
    items: envelope.data,
    total: Number(envelope.meta?.total ?? 0),
  };
}

export async function createArtReferencePackage(payload: CreateArtReferencePackagePayload) {
  return apiFetch<CreateArtReferencePackageResponse>("/api/v1/script-art-references/packages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getArtReferencePackage(packageId: string) {
  return apiFetch<ArtReferencePackage>(`/api/v1/script-art-references/packages/${packageId}`);
}

export async function updateArtReferencePackage(
  packageId: string,
  payload: Partial<Pick<ArtReferencePackage, "title" | "scriptName" | "scriptSummary" | "scriptTags" | "eraType" | "dominantStyleType" | "regionType" | "moodTypes" | "copyrightScope" | "copyrightNote">>,
) {
  return apiFetch<ArtReferencePackage>(`/api/v1/script-art-references/packages/${packageId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateArtReferenceImage(
  imageId: string,
  payload: Partial<Pick<ArtReferenceImage, "usageType" | "styleType" | "eraType" | "moodTypes" | "compositionTypes" | "caption">>,
) {
  return apiFetch<ArtReferenceImage>(`/api/v1/script-art-references/images/${imageId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteArtReferencePackage(packageId: string) {
  return apiFetch<void>(`/api/v1/script-art-references/packages/${packageId}`, { method: "DELETE" });
}

export async function deleteArtReferenceImage(imageId: string) {
  return apiFetch<void>(`/api/v1/script-art-references/images/${imageId}`, { method: "DELETE" });
}

export async function completeArtReferencePackageUpload(packageId: string, files: Array<{ clientFileId: string; etag?: string | null }>) {
  return apiFetch<ArtReferencePackage>(`/api/v1/script-art-references/packages/${packageId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files }),
  }, true, 30000);
}

export function uploadArtReferenceImage(
  target: ArtReferenceUploadTarget,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ clientFileId: string; etag?: string | null }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", target.uploadUrl);
    Object.entries(target.headers ?? {}).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    if (!target.headers?.["Content-Type"]) xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ clientFileId: target.clientFileId, etag: xhr.getResponseHeader("ETag")?.replaceAll("\"", "") });
        return;
      }
      reject(new Error(`图片上传失败：HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("图片上传 OSS 失败，请检查 OSS 跨域配置"));
    xhr.onabort = () => reject(new Error("图片上传被浏览器中断"));
    xhr.send(file);
  });
}

export async function assertImageCanLoad(url: string) {
  await fetchWithTimeout(url, { method: "GET", mode: "no-cors" }, 8000);
}
