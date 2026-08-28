export const KNOWLEDGE_RESOURCE_OPTIONS = [
  { label: "剧本", value: "script" },
  { label: "门店规则", value: "store_rule" },
  { label: "常见问题", value: "faq" },
  { label: "活动资料", value: "activity" },
  { label: "其他文档", value: "other" },
] as const;

export type KnowledgeResourceType = (typeof KNOWLEDGE_RESOURCE_OPTIONS)[number]["value"];

export type KnowledgeResourceFile = {
  clientFileId: string;
  relativePath: string;
  size: number;
  contentType: string;
  lastModified: number;
};

export type CreateKnowledgeResourcePayload = {
  resourceType: KnowledgeResourceType;
  documentId?: string;
  name: string;
  version: string;
  description?: string;
  tags: string[];
  files: KnowledgeResourceFile[];
};

export type UploadTarget = {
  clientFileId: string;
  objectKey: string;
  uploadUrl: string;
  headers?: Record<string, string>;
};

export type InitiateKnowledgeUploadResponse = {
  uploadId: string;
  documentId: string;
  versionId: string;
  expiresAt: string;
  files: UploadTarget[];
};

export type CompletedUploadFile = { clientFileId: string; etag: string };

export type KnowledgeUploadResult = {
  documentId: string;
  versionId: string;
  status: "uploaded" | "processing";
};
