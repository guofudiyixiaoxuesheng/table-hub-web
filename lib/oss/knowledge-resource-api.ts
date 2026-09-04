import type {
  CompletedUploadFile,
  CreateKnowledgeResourcePayload,
  InitiateKnowledgeUploadResponse,
  AssetPreviewUrlResult,
  KnowledgeResourceFile,
  KnowledgeDocumentListItem,
  KnowledgeDocumentListResult,
  KnowledgeDocumentManifest,
  KnowledgeChunkListResult,
  KnowledgeEmbeddingSummary,
  KnowledgeRetrievePayload,
  KnowledgeRetrieveResult,
  KnowledgeUploadDraft,
  KnowledgeUploadFailure,
  KnowledgeUploadResult,
  ListKnowledgeDocumentsParams,
  LoadKnowledgeDocumentResult,
  ParsedKnowledgeFile,
  ParsedMarkdownResult,
  ScriptGenreOption,
} from "./knowledge-resource-types";
import { createClientFileId, toManifestFile, type BrowserFolderFile } from "./knowledge-resource-manifest";
import { apiFetch, apiFetchEnvelope } from "@/lib/api/client";

const UPLOAD_API_TIMEOUT_MS = 120_000;
const KNOWLEDGE_PARSE_TIMEOUT_MS = 300_000;
const KNOWLEDGE_CHUNK_TIMEOUT_MS = 120_000;
const KNOWLEDGE_EMBEDDING_TIMEOUT_MS = 300_000;
const KNOWLEDGE_RETRIEVE_TIMEOUT_MS = 60_000;

export async function uploadKnowledgeResource(
  payload: Omit<CreateKnowledgeResourcePayload, "files">,
  sourceFiles: BrowserFolderFile[],
  onProgress?: (completed: number, total: number) => void,
  onHashProgress?: (completed: number, total: number) => void,
  idempotencyKey?: string,
): Promise<KnowledgeUploadResult> {
  const draft = await uploadKnowledgeResourceDraft(payload, sourceFiles, onProgress, onHashProgress);
  if (draft.failures.length) {
    throw new Error(`有 ${draft.failures.length} 个文件上传失败，请重试失败文件`);
  }
  return completeKnowledgeUpload(draft.initiate.uploadId, draft.completed, idempotencyKey);
}

export async function initiateKnowledgeUpload(
  payload: Omit<CreateKnowledgeResourcePayload, "files">,
  sourceFiles: BrowserFolderFile[],
  onHashProgress?: (completed: number, total: number) => void,
  idempotencyKey?: string,
): Promise<{ initiate: InitiateKnowledgeUploadResponse; manifestFiles: KnowledgeResourceFile[] }> {
  let hashed = 0;
  const files = await Promise.all(
    sourceFiles.map(async (file, index) => {
      const manifestFile = await toManifestFile(file, index);
      hashed += 1;
      onHashProgress?.(hashed, sourceFiles.length);
      return manifestFile;
    }),
  );
  const initiate = await apiFetch<InitiateKnowledgeUploadResponse>("/api/v1/knowledge/uploads/initiate", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
    body: JSON.stringify({ ...payload, files }),
  }, true, UPLOAD_API_TIMEOUT_MS);
  return { initiate, manifestFiles: files };
}

async function uploadSingleFile(
  file: BrowserFolderFile,
  index: number,
  initiate: InitiateKnowledgeUploadResponse,
  manifestFiles: KnowledgeResourceFile[],
): Promise<CompletedUploadFile> {
  const targets = new Map(initiate.files.map((target) => [target.clientFileId, target]));
  const manifests = new Map(manifestFiles.map((file) => [file.clientFileId, file]));
  const clientFileId = createClientFileId(file, index);
  const target = targets.get(clientFileId);
  if (!target) throw new Error(`服务端未返回文件上传地址：${file.name}`);

  const response = await fetch(target.uploadUrl, {
    method: "PUT",
    headers: target.headers,
    body: file,
  });
  if (!response.ok) throw new Error(`文件上传失败：${file.name}`);

  return {
    clientFileId,
    etag: response.headers.get("etag") ?? "",
    sha256: manifests.get(clientFileId)?.sha256 ?? "",
  };
}

export async function uploadKnowledgeResourceDraft(
  payload: Omit<CreateKnowledgeResourcePayload, "files">,
  sourceFiles: BrowserFolderFile[],
  onProgress?: (completed: number, total: number) => void,
  onHashProgress?: (completed: number, total: number) => void,
  idempotencyKey?: string,
): Promise<KnowledgeUploadDraft> {
  const { initiate, manifestFiles } = await initiateKnowledgeUpload(payload, sourceFiles, onHashProgress, idempotencyKey);
  const completed: CompletedUploadFile[] = [];
  const failures: KnowledgeUploadFailure[] = [];

  for (const [index, file] of sourceFiles.entries()) {
    try {
      completed.push(await uploadSingleFile(file, index, initiate, manifestFiles));
    } catch (error) {
      failures.push({
        clientFileId: createClientFileId(file, index),
        relativePath: file.webkitRelativePath || file.name,
        error: error instanceof Error ? error.message : "上传失败",
      });
    }
    onProgress?.(completed.length, sourceFiles.length);
  }

  return { initiate, manifestFiles, completed, failures };
}

export async function retryFailedKnowledgeUploads(
  draft: KnowledgeUploadDraft,
  sourceFiles: BrowserFolderFile[],
  onProgress?: (completed: number, total: number) => void,
): Promise<KnowledgeUploadDraft> {
  const failedIds = new Set(draft.failures.map((item) => item.clientFileId));
  const completedIds = new Set(draft.completed.map((item) => item.clientFileId));
  const nextCompleted = [...draft.completed];
  const nextFailures: KnowledgeUploadFailure[] = [];
  let retried = 0;
  const retryTargets = sourceFiles
    .map((file, index) => ({ file, index, clientFileId: createClientFileId(file, index) }))
    .filter((item) => failedIds.has(item.clientFileId) && !completedIds.has(item.clientFileId));

  for (const item of retryTargets) {
    try {
      nextCompleted.push(await uploadSingleFile(item.file, item.index, draft.initiate, draft.manifestFiles));
    } catch (error) {
      nextFailures.push({
        clientFileId: item.clientFileId,
        relativePath: item.file.webkitRelativePath || item.file.name,
        error: error instanceof Error ? error.message : "上传失败",
      });
    }
    retried += 1;
    onProgress?.(retried, retryTargets.length);
  }
  return { ...draft, completed: nextCompleted, failures: nextFailures };
}

export function completeKnowledgeUpload(uploadId: string, completed: CompletedUploadFile[], idempotencyKey?: string): Promise<KnowledgeUploadResult> {
  return apiFetch<KnowledgeUploadResult>(`/api/v1/knowledge/uploads/${uploadId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
    body: JSON.stringify({ files: completed }),
  }, true, UPLOAD_API_TIMEOUT_MS);
}

export async function listKnowledgeDocuments(params: ListKnowledgeDocumentsParams = {}): Promise<KnowledgeDocumentListResult> {
  const query = new URLSearchParams();
  if (params.resourceType) query.set("resourceType", params.resourceType);
  if (params.keyword?.trim()) query.set("keyword", params.keyword.trim());
  if (params.status) query.set("status", params.status);
  if (params.hasActiveVersion !== undefined) query.set("hasActiveVersion", String(params.hasActiveVersion));
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const envelope = await apiFetchEnvelope<KnowledgeDocumentListItem[]>(`/api/v1/knowledge/documents${suffix}`);
  const meta = envelope.meta ?? {};
  return {
    items: envelope.data,
    meta: {
      total: Number(meta.total ?? envelope.data.length),
      page: Number(meta.page ?? params.page ?? 1),
      pageSize: Number(meta.pageSize ?? params.pageSize ?? envelope.data.length),
    },
  };
}

export async function listScriptGenres(): Promise<ScriptGenreOption[]> {
  return apiFetch<ScriptGenreOption[]>("/api/v1/knowledge/script-genres");
}

export function getKnowledgeManifest(documentId: string, versionId: string): Promise<KnowledgeDocumentManifest> {
  return apiFetch<KnowledgeDocumentManifest>(`/api/v1/knowledge/${documentId}/versions/${versionId}/manifest`);
}

export function deleteKnowledgeDocument(documentId: string): Promise<void> {
  return apiFetch<void>(`/api/v1/knowledge/${documentId}`, { method: "DELETE" });
}

export function loadKnowledgeDocument(documentId: string, versionId: string, idempotencyKey?: string): Promise<LoadKnowledgeDocumentResult> {
  return apiFetch<LoadKnowledgeDocumentResult>(`/api/v1/knowledge/${documentId}/versions/${versionId}/load`, {
    method: "POST",
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
  }, true, KNOWLEDGE_PARSE_TIMEOUT_MS);
}

export function loadKnowledgeFile(documentId: string, versionId: string, fileId: string, idempotencyKey?: string): Promise<ParsedKnowledgeFile> {
  return apiFetch<ParsedKnowledgeFile>(`/api/v1/knowledge/${documentId}/versions/${versionId}/files/${fileId}/load`, {
    method: "POST",
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
  }, true, KNOWLEDGE_PARSE_TIMEOUT_MS);
}

export function listLoadedFiles(documentId: string, versionId: string): Promise<LoadKnowledgeDocumentResult> {
  return apiFetch<LoadKnowledgeDocumentResult>(`/api/v1/knowledge/${documentId}/versions/${versionId}/loaded-files`);
}

export function deleteKnowledgeFile(documentId: string, versionId: string, fileId: string): Promise<LoadKnowledgeDocumentResult> {
  return apiFetch<LoadKnowledgeDocumentResult>(`/api/v1/knowledge/${documentId}/versions/${versionId}/files/${fileId}`, { method: "DELETE" });
}

export function saveManualParsedText(documentId: string, versionId: string, fileId: string, text: string): Promise<ParsedKnowledgeFile> {
  return apiFetch<ParsedKnowledgeFile>(`/api/v1/knowledge/${documentId}/versions/${versionId}/files/${fileId}/manual-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  }, true, KNOWLEDGE_PARSE_TIMEOUT_MS);
}

export function getLoadedMarkdown(documentId: string, versionId: string, parsedFileId: string): Promise<ParsedMarkdownResult> {
  return apiFetch<ParsedMarkdownResult>(`/api/v1/knowledge/${documentId}/versions/${versionId}/loaded-files/${parsedFileId}/markdown`);
}

export function getAssetPreviewUrl(assetId: string): Promise<AssetPreviewUrlResult> {
  return apiFetch<AssetPreviewUrlResult>(`/api/v1/knowledge/assets/${assetId}/preview-url`);
}

export function chunkKnowledgeDocument(documentId: string, versionId: string, idempotencyKey?: string): Promise<KnowledgeChunkListResult> {
  return apiFetch<KnowledgeChunkListResult>(`/api/v1/knowledge/${documentId}/versions/${versionId}/chunks`, {
    method: "POST",
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
  }, true, KNOWLEDGE_CHUNK_TIMEOUT_MS);
}

export function listKnowledgeChunks(documentId: string, versionId: string): Promise<KnowledgeChunkListResult> {
  return apiFetch<KnowledgeChunkListResult>(`/api/v1/knowledge/${documentId}/versions/${versionId}/chunks`);
}

export function embedKnowledgeChunks(documentId: string, versionId: string, idempotencyKey?: string): Promise<KnowledgeEmbeddingSummary> {
  return apiFetch<KnowledgeEmbeddingSummary>(`/api/v1/knowledge/${documentId}/versions/${versionId}/embeddings`, {
    method: "POST",
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
  }, true, KNOWLEDGE_EMBEDDING_TIMEOUT_MS);
}

export function listKnowledgeEmbeddings(documentId: string, versionId: string): Promise<KnowledgeEmbeddingSummary> {
  return apiFetch<KnowledgeEmbeddingSummary>(`/api/v1/knowledge/${documentId}/versions/${versionId}/embeddings`);
}

export function retrieveKnowledgeChunks(documentId: string, versionId: string, payload: KnowledgeRetrievePayload): Promise<KnowledgeRetrieveResult> {
  return apiFetch<KnowledgeRetrieveResult>(`/api/v1/knowledge/${documentId}/versions/${versionId}/retrieve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, true, KNOWLEDGE_RETRIEVE_TIMEOUT_MS);
}
