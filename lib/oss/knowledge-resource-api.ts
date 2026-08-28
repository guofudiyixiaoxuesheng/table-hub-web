import type {
  CompletedUploadFile,
  CreateKnowledgeResourcePayload,
  InitiateKnowledgeUploadResponse,
  KnowledgeUploadResult,
} from "./knowledge-resource-types";
import { createClientFileId, type BrowserFolderFile } from "./knowledge-resource-manifest";
import { apiFetch } from "@/lib/api/client";

export async function uploadKnowledgeResource(
  payload: CreateKnowledgeResourcePayload,
  sourceFiles: BrowserFolderFile[],
  onProgress?: (completed: number, total: number) => void,
): Promise<KnowledgeUploadResult> {
  const initiate = await apiFetch<InitiateKnowledgeUploadResponse>("/api/v1/knowledge/uploads/initiate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const targets = new Map(initiate.files.map((target) => [target.clientFileId, target]));
  const completed: CompletedUploadFile[] = [];

  for (const [index, file] of sourceFiles.entries()) {
    const clientFileId = createClientFileId(file, index);
    const target = targets.get(clientFileId);
    if (!target) throw new Error(`服务端未返回文件上传地址：${file.name}`);

    const response = await fetch(target.uploadUrl, {
      method: "PUT",
      headers: target.headers,
      body: file,
    });
    if (!response.ok) throw new Error(`文件上传失败：${file.name}`);

    completed.push({ clientFileId, etag: response.headers.get("etag") ?? "" });
    onProgress?.(completed.length, sourceFiles.length);
  }

  return apiFetch<KnowledgeUploadResult>(`/api/v1/knowledge/uploads/${initiate.uploadId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files: completed }),
  });
}
