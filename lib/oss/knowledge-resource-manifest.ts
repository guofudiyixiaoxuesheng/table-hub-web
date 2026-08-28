import type { CreateKnowledgeResourcePayload, KnowledgeResourceFile } from "./knowledge-resource-types";

export type BrowserFolderFile = File & { webkitRelativePath?: string };

export function getRelativePath(file: BrowserFolderFile): string {
  return file.webkitRelativePath || file.name;
}

export function createClientFileId(file: BrowserFolderFile, index: number): string {
  return `${index}-${file.size}-${file.lastModified}`;
}

export function toManifestFile(file: BrowserFolderFile, index: number): KnowledgeResourceFile {
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
