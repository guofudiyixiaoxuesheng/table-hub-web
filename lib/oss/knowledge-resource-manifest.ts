import type { CreateKnowledgeResourcePayload, KnowledgeResourceFile } from "./knowledge-resource-types";

export type BrowserFolderFile = File & { webkitRelativePath?: string };

export function getRelativePath(file: BrowserFolderFile): string {
  return file.webkitRelativePath || file.name;
}

export function createClientFileId(file: BrowserFolderFile, index: number): string {
  return `${index}-${file.size}-${file.lastModified}`;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function calculateSha256(file: File): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()));
}

export async function toManifestFile(file: BrowserFolderFile, index: number): Promise<KnowledgeResourceFile> {
  return {
    clientFileId: createClientFileId(file, index),
    relativePath: getRelativePath(file),
    size: file.size,
    contentType: file.type || "application/octet-stream",
    lastModified: file.lastModified,
    sha256: await calculateSha256(file),
  };
}

export function toManifestPreview(file: BrowserFolderFile, index: number): Omit<KnowledgeResourceFile, "sha256"> {
  return {
    clientFileId: createClientFileId(file, index),
    relativePath: getRelativePath(file),
    size: file.size,
    contentType: file.type || "application/octet-stream",
    lastModified: file.lastModified,
  };
}

export function downloadManifest(payload: CreateKnowledgeResourcePayload): void {
  const manifest = {
    manifestVersion: "1.0",
    exportedAt: new Date().toISOString(),
    ...payload,
  };
  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${payload.name}-${payload.version}-manifest.json`;
  link.click();
  URL.revokeObjectURL(url);
}
