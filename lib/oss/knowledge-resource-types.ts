export const KNOWLEDGE_RESOURCE_OPTIONS = [
  { label: "剧本", value: "script" },
  { label: "门店规则", value: "store_rule" },
  { label: "常见问题", value: "faq" },
  { label: "活动资料", value: "activity" },
  { label: "其他文档", value: "other" },
] as const;

export const SCRIPT_GENRE_OPTIONS = [
  { label: "推理本/硬核本", value: "mystery_hardcore" },
  { label: "还原本", value: "restoration" },
  { label: "情感本", value: "emotional" },
  { label: "机制本", value: "mechanism" },
  { label: "阵营本", value: "faction" },
  { label: "欢乐本", value: "comedy" },
  { label: "恐怖本", value: "horror" },
] as const;

export type KnowledgeResourceType = (typeof KNOWLEDGE_RESOURCE_OPTIONS)[number]["value"];
export type ScriptGenre = (typeof SCRIPT_GENRE_OPTIONS)[number]["value"];

export type KnowledgeResourceFile = {
  clientFileId: string;
  relativePath: string;
  size: number;
  contentType: string;
  lastModified: number;
  sha256: string;
};

export type CreateKnowledgeResourcePayload = {
  resourceType: KnowledgeResourceType;
  documentId?: string;
  name: string;
  version: string;
  description?: string;
  scriptGenre?: ScriptGenre;
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

export type CompletedUploadFile = { clientFileId: string; etag: string; sha256: string };

export type KnowledgeUploadResult = {
  documentId: string;
  versionId: string;
  status: "uploaded" | "processing";
};

export type KnowledgeUploadFailure = {
  clientFileId: string;
  relativePath: string;
  error: string;
};

export type KnowledgeUploadDraft = {
  initiate: InitiateKnowledgeUploadResponse;
  manifestFiles: KnowledgeResourceFile[];
  completed: CompletedUploadFile[];
  failures: KnowledgeUploadFailure[];
};

export type KnowledgeDocumentListItem = {
  id: string;
  resourceType: KnowledgeResourceType;
  scriptGenre?: ScriptGenre | null;
  name: string;
  description?: string | null;
  tags: string[];
  status: string;
  activeVersionId?: string | null;
  activeVersion?: string | null;
  fileCount: number;
  totalSize: number;
  updatedAt: string;
};

export type KnowledgeManifestFile = KnowledgeResourceFile & {
  fileId: string;
  objectKey: string;
  etag?: string | null;
};

export type KnowledgeDocumentManifest = {
  manifestVersion: string;
  documentId: string;
  versionId: string;
  storeId: string;
  resourceType: KnowledgeResourceType;
  scriptGenre?: ScriptGenre | null;
  name: string;
  version: string;
  description?: string | null;
  tags: string[];
  status: string;
  files: KnowledgeManifestFile[];
};

export type ParsedKnowledgeFile = {
  id: string;
  fileId: string;
  relativePath: string;
  loaderType: string;
  status: "pending" | "processing" | "ready" | "failed";
  markdownKey?: string | null;
  textSha256?: string | null;
  charCount: number;
  assetCount: number;
  errorMessage?: string | null;
  completedAt?: string | null;
};

export type LoadKnowledgeDocumentResult = {
  documentId: string;
  versionId: string;
  files: ParsedKnowledgeFile[];
};

export type ParsedMarkdownResult = {
  parsedFileId: string;
  fileId: string;
  relativePath: string;
  markdown: string;
};

export type AssetPreviewUrlResult = {
  assetId: string;
  previewUrl: string;
};

export type KnowledgeChunk = {
  id: string;
  documentId: string;
  versionId: string;
  parsedFileId: string;
  fileId: string;
  relativePath: string;
  chunkIndex: number;
  chunkType: "story" | "task" | "character_impression" | "rule" | "image" | "note";
  status: "ready" | "failed";
  title?: string | null;
  act?: string | null;
  roleName?: string | null;
  content: string;
  contentSha256: string;
  charCount: number;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type KnowledgeChunkFileSummary = {
  fileId: string;
  parsedFileId: string;
  relativePath: string;
  roleName?: string | null;
  acts: string[];
  chunkCount: number;
  typeCounts: Record<string, number>;
  status: string;
  updatedAt?: string | null;
};

export type KnowledgeChunkListResult = {
  documentId: string;
  versionId: string;
  totalChunks: number;
  chunkedFiles: number;
  totalFiles: number;
  typeCounts: Record<string, number>;
  files: KnowledgeChunkFileSummary[];
  chunks: KnowledgeChunk[];
};

export type KnowledgeEmbeddingSummary = {
  documentId: string;
  versionId: string;
  model: string;
  dimension: number;
  totalChunks: number;
  embeddedChunks: number;
  failedChunks: number;
  pendingChunks: number;
  updatedAt?: string | null;
};

export type KnowledgeRetrieveMode = "bm25" | "vector" | "hybrid";

export type KnowledgeRetrievePayload = {
  query: string;
  topK?: number;
  mode?: KnowledgeRetrieveMode;
  roleName?: string;
  act?: string;
  chunkType?: string;
};

export type KnowledgeRetrievedChunk = {
  chunkId: string;
  fileId: string;
  relativePath: string;
  title?: string | null;
  act?: string | null;
  roleName?: string | null;
  chunkType: string;
  content: string;
  score: number;
  scoreType: string;
};

export type KnowledgeRetrieveResult = {
  documentId: string;
  versionId: string;
  query: string;
  mode: KnowledgeRetrieveMode;
  results: KnowledgeRetrievedChunk[];
};
