"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftOutlined,
  BranchesOutlined,
  CheckCircleOutlined,
  ClusterOutlined,
  EyeOutlined,
  FileTextOutlined,
  FormOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  ScissorOutlined,
  DeleteOutlined,
  CloudUploadOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import { XMarkdown } from "@ant-design/x-markdown";
import { Button, Card, Col, Collapse, Descriptions, Drawer, Empty, Form, Image, Input, InputNumber, Modal, Progress, Row, Select, Space, Statistic, Table, Tabs, Tag, Timeline, Tooltip, Typography, message } from "antd";
import { chunkKnowledgeDocument, deleteKnowledgeFile, embedKnowledgeChunks, getAssetPreviewUrl, getKnowledgeManifest, getLoadedMarkdown, listKnowledgeChunks, listKnowledgeDocuments, listKnowledgeEmbeddings, listLoadedFiles, loadKnowledgeDocument, loadKnowledgeFile, retrieveKnowledgeChunks, saveManualParsedText } from "@/lib/oss/knowledge-resource-api";
import { useIdempotencyKey } from "@/lib/hooks/use-idempotency-key";
import { createClientId } from "@/lib/utils/create-client-id";
import {
  KNOWLEDGE_RESOURCE_OPTIONS,
  SCRIPT_GENRE_OPTIONS,
  type KnowledgeChunk,
  type KnowledgeChunkFileSummary,
  type KnowledgeChunkListResult,
  type KnowledgeDocumentListItem,
  type KnowledgeEmbeddingSummary,
  type KnowledgeDocumentManifest,
  type KnowledgeManifestFile,
  type KnowledgeRetrievedChunk,
  type KnowledgeRetrieveMode,
  type ParsedKnowledgeFile,
  type ParsedMarkdownResult,
} from "@/lib/oss/knowledge-resource-types";
import { approveScriptMarketingAsset, generateScriptMarketingAssets, generateScriptMarketingImages, listScriptMarketingAssets, type ScriptMarketingAssetResult } from "@/lib/script-marketing/script-marketing-api";
import { deleteOpeningManual, generateOpeningManual, getOpeningManual, listOpeningManuals, type OpeningManualResult } from "@/lib/script-opening-manual/script-opening-manual-api";
import { approveScriptProfile, generateScriptProfile, getScriptProfileByDocument, updateScriptProfile, type ScriptProfileResult } from "@/lib/script-profile/script-profile-api";
import { ScriptMarketingResult } from "@/features/script-marketing/script-marketing-result";
import styles from "./knowledge-dashboard.module.css";

const resourceLabels = new Map(KNOWLEDGE_RESOURCE_OPTIONS.map((item) => [item.value, item.label]));
const scriptGenreLabels = new Map(SCRIPT_GENRE_OPTIONS.map((item) => [item.value, item.label]));
const chunkTypeLabels: Record<string, string> = {
  story: "剧情",
  task: "任务",
  character_impression: "人物印象",
  rule: "规则",
  image: "图片",
  note: "笔记",
};

const ragSteps = [
  { key: "loaded", title: "识别文件内容", icon: <FileTextOutlined /> },
  { key: "chunked", title: "整理资料结构", icon: <BranchesOutlined /> },
  { key: "vectorized", title: "建立 AI 索引", icon: <ClusterOutlined /> },
];

const fileStatusOptions = [
  { label: "全部状态", value: "all" },
  { label: "未加载", value: "not_loaded" },
  { label: "待处理", value: "pending" },
  { label: "处理中", value: "processing" },
  { label: "完成", value: "ready" },
  { label: "待转换", value: "skipped" },
  { label: "失败", value: "failed" },
] as const;

type FileStatusFilter = (typeof fileStatusOptions)[number]["value"];

const profileStatusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "AI 草稿", color: "processing" },
  needs_review: { label: "需人工确认", color: "warning" },
  approved: { label: "已确认可用", color: "success" },
  failed: { label: "生成失败", color: "error" },
};

function buildUploadVersionHref(document: KnowledgeDocumentListItem): string {
  const params = new URLSearchParams({
    documentId: document.id,
    resourceType: document.resourceType,
    name: document.name,
  });
  if (document.activeVersion) params.set("currentVersion", document.activeVersion);
  if (document.scriptGenre) params.set("scriptGenre", document.scriptGenre);
  if (document.description) params.set("description", document.description);
  if (document.tags.length) params.set("tags", document.tags.join(","));
  return `/knowledge/upload?${params.toString()}`;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function shortHash(value?: string | null): string {
  return value ? `${value.slice(0, 10)}...${value.slice(-6)}` : "暂无";
}

function EllipsisText({ value, copyable = false }: { value?: React.ReactNode; copyable?: boolean }) {
  const text = value == null || value === "" ? "暂无" : String(value);
  const content = (
    <span className={styles.ellipsisText}>
      {copyable ? <Typography.Text copyable>{text}</Typography.Text> : text}
    </span>
  );
  return <Tooltip title={<div className={styles.ellipsisTooltip}>{text}</div>}>{content}</Tooltip>;
}

function extractAssetIds(markdown: string): string[] {
  const pattern = /!\[[^\]]*\]\(asset:\/\/([^)]+)\)/g;
  return Array.from(new Set(Array.from(markdown.matchAll(pattern), (match) => match[1])));
}

function renderMarkdownWithAssets(markdown: string, assetUrls: Map<string, string>) {
  const pattern = /!\[([^\]]*)\]\(asset:\/\/([^)]+)\)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  for (const match of markdown.matchAll(pattern)) {
    if (match.index > lastIndex) nodes.push(markdown.slice(lastIndex, match.index));
    const assetId = match[2];
    const imageUrl = assetUrls.get(assetId);
    nodes.push(
      <div key={`${assetId}-${match.index}`} style={{ margin: "12px 0" }}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={match[1] || assetId}
            style={{ maxHeight: 420, objectFit: "contain", borderRadius: 12 }}
          />
        ) : (
          <Typography.Text type="secondary">图片加载中：{match[1] || assetId}</Typography.Text>
        )}
      </div>,
    );
    lastIndex = match.index + match[0].length;
  }
  nodes.push(markdown.slice(lastIndex));
  return nodes;
}

function validationNumber(validation: Record<string, unknown>, key: string): number | null {
  const value = validation[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function validationStringList(validation: Record<string, unknown>, key: string): string[] {
  const value = validation[key];
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function validationText(validation: Record<string, unknown>, key: string): string {
  const value = validation[key];
  return typeof value === "string" ? value : "";
}

function percentValue(value: number | null): number {
  return Math.round(Math.max(0, Math.min(1, value ?? 0)) * 100);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function manualOverallValidation(validation: Record<string, unknown>): Record<string, unknown> {
  const overall = asRecord(validation.overall);
  return Object.keys(overall).length ? overall : validation;
}

function manualScriptFacts(validation: Record<string, unknown>): Record<string, unknown> {
  return asRecord(validation.scriptFacts);
}

export function KnowledgeResourceDetail({ documentId }: { documentId: string }) {
  const [document, setDocument] = useState<KnowledgeDocumentListItem | null>(null);
  const [manifest, setManifest] = useState<KnowledgeDocumentManifest | null>(null);
  const [parsedFiles, setParsedFiles] = useState<ParsedKnowledgeFile[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [preview, setPreview] = useState<ParsedMarkdownResult | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [chunkResult, setChunkResult] = useState<KnowledgeChunkListResult | null>(null);
  const [chunkDrawerFile, setChunkDrawerFile] = useState<KnowledgeChunkFileSummary | null>(null);
  const [embeddingResult, setEmbeddingResult] = useState<KnowledgeEmbeddingSummary | null>(null);
  const [retrieveMode, setRetrieveMode] = useState<KnowledgeRetrieveMode>("hybrid");
  const [retrieveQuery, setRetrieveQuery] = useState("");
  const [retrieving, setRetrieving] = useState(false);
  const [retrieveResults, setRetrieveResults] = useState<KnowledgeRetrievedChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [chunking, setChunking] = useState(false);
  const [embedding, setEmbedding] = useState(false);
  const [preparingAi, setPreparingAi] = useState(false);
  const [showProcessDetails, setShowProcessDetails] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("guide") === "load";
  });
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [manualTextFile, setManualTextFile] = useState<KnowledgeManifestFile | null>(null);
  const [manualText, setManualText] = useState("");
  const [savingManualText, setSavingManualText] = useState(false);
  const [reloadingFileId, setReloadingFileId] = useState<string | null>(null);
  const [assetUrls, setAssetUrls] = useState<Map<string, string>>(new Map());
  const [fileKeyword, setFileKeyword] = useState("");
  const [fileStatusFilter, setFileStatusFilter] = useState<FileStatusFilter>("all");
  const [marketingLoading, setMarketingLoading] = useState(false);
  const [marketingOpen, setMarketingOpen] = useState(false);
  const [marketingResult, setMarketingResult] = useState<ScriptMarketingAssetResult | null>(null);
  const [marketingVersions, setMarketingVersions] = useState<ScriptMarketingAssetResult[]>([]);
  const [marketingFeedbackOpen, setMarketingFeedbackOpen] = useState(false);
  const [marketingFeedback, setMarketingFeedback] = useState("");
  const [marketingImageLoadingId, setMarketingImageLoadingId] = useState<string | null>(null);
  const [openingManualLoading, setOpeningManualLoading] = useState(false);
  const [openingManualOpen, setOpeningManualOpen] = useState(false);
  const [openingManualResult, setOpeningManualResult] = useState<OpeningManualResult | null>(null);
  const [openingManualVersions, setOpeningManualVersions] = useState<OpeningManualResult[]>([]);
  const [openingManualDeletingId, setOpeningManualDeletingId] = useState<string | null>(null);
  const [scriptProfile, setScriptProfile] = useState<ScriptProfileResult | null>(null);
  const [scriptProfileLoading, setScriptProfileLoading] = useState(false);
  const [scriptProfileOpen, setScriptProfileOpen] = useState(false);
  const [scriptProfileForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const loadAllIdempotency = useIdempotencyKey([document?.id, document?.activeVersionId, "load-all"]);
  const chunkIdempotency = useIdempotencyKey([document?.id, document?.activeVersionId, "chunk"]);
  const embeddingIdempotency = useIdempotencyKey([document?.id, document?.activeVersionId, "embedding"]);
  const [modalApi, modalContextHolder] = Modal.useModal();

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const documents = await listKnowledgeDocuments({ pageSize: 100 });
      const current = documents.items.find((item) => item.id === documentId) ?? null;
      if (!current) {
        setDocument(null);
        return;
      }
      const detail = current.activeVersionId ? await getKnowledgeManifest(current.id, current.activeVersionId) : null;
      const loaded = current.activeVersionId ? await listLoadedFiles(current.id, current.activeVersionId) : null;
      const chunks = current.activeVersionId ? await listKnowledgeChunks(current.id, current.activeVersionId) : null;
      const embeddings = current.activeVersionId ? await listKnowledgeEmbeddings(current.id, current.activeVersionId) : null;
      setDocument(current);
      setManifest(detail);
      setParsedFiles(loaded?.files ?? []);
      setChunkResult(chunks);
      setEmbeddingResult(embeddings);
      if (current.resourceType === "script") {
        setMarketingVersions(await listScriptMarketingAssets(current.id, "approved"));
        setOpeningManualVersions(await listOpeningManuals(current.id));
        setScriptProfile(await getScriptProfileByDocument(current.id));
      }
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "知识库详情加载失败");
    } finally {
      setLoading(false);
    }
  }, [documentId, messageApi]);

  useEffect(() => {
    void Promise.resolve().then(loadDetail);
  }, [loadDetail]);

  useEffect(() => {
    let mounted = true;
    async function loadAssetUrls() {
      if (!preview?.markdown) {
        setAssetUrls(new Map());
        return;
      }
      const assetIds = extractAssetIds(preview.markdown);
      if (!assetIds.length) {
        setAssetUrls(new Map());
        return;
      }
      try {
        const entries = await Promise.all(
          assetIds.map(async (assetId) => {
            const result = await getAssetPreviewUrl(assetId);
            return [assetId, result.previewUrl] as const;
          }),
        );
        if (mounted) setAssetUrls(new Map(entries));
      } catch (error) {
        messageApi.error(error instanceof Error ? error.message : "图片预览地址获取失败");
      }
    }
    loadAssetUrls();
    return () => {
      mounted = false;
    };
  }, [messageApi, preview?.markdown]);

  const files = useMemo(() => manifest?.files ?? [], [manifest]);
  const loadedReadyCount = parsedFiles.filter((file) => file.status === "ready").length;
  const loadedSkippedCount = parsedFiles.filter((file) => file.status === "skipped").length;
  const loadedHandledCount = loadedReadyCount + loadedSkippedCount;
  const loadedPercent = files.length ? Math.round((loadedHandledCount / files.length) * 100) : 0;
  const loadedDone = files.length > 0 && loadedHandledCount === files.length;
  const chunkDone = Boolean(chunkResult?.totalChunks);
  const embeddingDone = Boolean(embeddingResult?.totalChunks && embeddingResult.embeddedChunks === embeddingResult.totalChunks);
  const aiReady = loadedDone && chunkDone && embeddingDone;
  const hasPartialError = parsedFiles.some((file) => file.status === "failed") || Boolean(embeddingResult?.failedChunks);
  const completedSteps = [loadedDone, chunkDone, embeddingDone].filter(Boolean).length;
  const pipelinePercent = Math.round((completedSteps / ragSteps.length) * 100);
  const aiStatus = aiReady ? "可使用" : hasPartialError ? "部分异常" : completedSteps ? "整理中" : "未准备";
  const aiStatusColor = aiReady ? "success" : hasPartialError ? "error" : completedSteps ? "processing" : "default";
  const aiStatusText = aiReady
    ? "AI 已经可以基于这个资源回答玩家和 DM 的问题。"
    : hasPartialError
      ? "部分文件处理失败，AI 可能无法完整使用这个资源。"
      : completedSteps
        ? "资料已经处理了一部分，建议点击一键整理补齐剩余步骤。"
        : "资料还没有整理给 AI 使用，AI 暂时不能基于它稳定回答。";
  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);
  const parsedByPath = useMemo(() => new Map(parsedFiles.map((file) => [file.relativePath, file])), [parsedFiles]);
  const filteredFiles = useMemo(() => {
    const keyword = fileKeyword.trim().toLowerCase();
    return files.filter((file) => {
      const parsed = parsedByPath.get(file.relativePath);
      const status = parsed?.status ?? "not_loaded";
      const matchStatus = fileStatusFilter === "all" || status === fileStatusFilter;
      const searchable = `${file.relativePath} ${file.contentType}`.toLowerCase();
      const matchKeyword = !keyword || searchable.includes(keyword);
      return matchStatus && matchKeyword;
    });
  }, [fileKeyword, fileStatusFilter, files, parsedByPath]);
  const chunksForDrawer = useMemo(
    () => chunkResult?.chunks.filter((chunk) => chunk.fileId === chunkDrawerFile?.fileId) ?? [],
    [chunkDrawerFile?.fileId, chunkResult?.chunks],
  );

  const loadAllDocuments = async () => {
    if (!document?.activeVersionId) return;
    setLoadingDocuments(true);
    try {
      const result = await loadKnowledgeDocument(document.id, document.activeVersionId, loadAllIdempotency.getKey());
      setParsedFiles(result.files);
      messageApi.success("文档加载完成");
      loadAllIdempotency.reset();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "文档加载失败");
    } finally {
      setLoadingDocuments(false);
    }
  };

  const confirmLoadAllDocuments = () => {
    if (!document?.activeVersionId) return;
    modalApi.confirm({
      title: "加载文档",
      content: `将对当前版本的 ${files.length} 个文件执行加载。已加载成功的文件会跳过，失败或未加载的文件会重新处理。`,
      okText: "加载所有文档",
      cancelText: "取消",
      okButtonProps: { loading: loadingDocuments },
      onOk: loadAllDocuments,
    });
  };

  const triggerChunk = async () => {
    if (!document?.activeVersionId) return;
    setChunking(true);
    try {
      const result = await chunkKnowledgeDocument(document.id, document.activeVersionId, chunkIdempotency.getKey());
      setChunkResult(result);
      messageApi.success("文档切片完成");
      chunkIdempotency.reset();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "文档切片失败");
    } finally {
      setChunking(false);
    }
  };

  const triggerEmbedding = async () => {
    if (!document?.activeVersionId) return;
    setEmbedding(true);
    try {
      const result = await embedKnowledgeChunks(document.id, document.activeVersionId, embeddingIdempotency.getKey());
      setEmbeddingResult(result);
      messageApi.success("向量化完成");
      embeddingIdempotency.reset();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "向量化失败");
    } finally {
      setEmbedding(false);
    }
  };

  const prepareForAi = async () => {
    if (!document?.activeVersionId) return;
    setPreparingAi(true);
    try {
      if (!loadedDone) {
        const loaded = await loadKnowledgeDocument(document.id, document.activeVersionId, loadAllIdempotency.getKey());
        setParsedFiles(loaded.files);
        loadAllIdempotency.reset();
      }
      const chunked = await chunkKnowledgeDocument(document.id, document.activeVersionId, chunkIdempotency.getKey());
      setChunkResult(chunked);
      chunkIdempotency.reset();
      const embedded = await embedKnowledgeChunks(document.id, document.activeVersionId, embeddingIdempotency.getKey());
      setEmbeddingResult(embedded);
      embeddingIdempotency.reset();
      messageApi.success("资料已整理完成，AI 可以使用了");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "一键整理失败，请查看处理详情");
      setShowProcessDetails(true);
    } finally {
      setPreparingAi(false);
    }
  };

  const triggerRetrieve = async () => {
    if (!document?.activeVersionId || !retrieveQuery.trim()) return;
    setRetrieving(true);
    try {
      const result = await retrieveKnowledgeChunks(document.id, document.activeVersionId, {
        query: retrieveQuery.trim(),
        mode: retrieveMode,
        topK: 8,
      });
      setRetrieveResults(result.results);
      messageApi.success(`检索完成，命中 ${result.results.length} 个 chunk`);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "检索失败");
    } finally {
      setRetrieving(false);
    }
  };

  const generateMarketing = async (extraRequirement?: string | null) => {
    if (!document) return;
    setMarketingLoading(true);
    try {
      const result = await generateScriptMarketingAssets(document.id, {
        purpose: "script_profile",
        tone: "新手友好、商业宣传、适合门店 H5 展示",
        avoidSpoilers: true,
        extraRequirement,
      });
      setMarketingResult(result);
      setMarketingOpen(true);
      setMarketingFeedbackOpen(false);
      setMarketingFeedback("");
      messageApi.success("AI 运营物料已生成");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "AI 运营物料生成失败");
    } finally {
      setMarketingLoading(false);
    }
  };

  const openScriptProfileDrawer = () => {
    if (!scriptProfile) return;
    scriptProfileForm.setFieldsValue({
      name: scriptProfile.name,
      aliasNames: scriptProfile.aliasNames,
      genres: scriptProfile.genres,
      playerCountMin: scriptProfile.playerCountMin,
      playerCountMax: scriptProfile.playerCountMax,
      durationMinutes: scriptProfile.durationMinutes,
      difficulty: scriptProfile.difficulty,
      dmDifficulty: scriptProfile.dmDifficulty,
      summary: scriptProfile.summary,
      storyBackground: scriptProfile.storyBackground,
      truthSummary: scriptProfile.truthSummary,
      sellingPoints: scriptProfile.sellingPoints,
      suitablePlayers: scriptProfile.suitablePlayers,
      coreMechanics: scriptProfile.coreMechanics,
      materialChecklist: scriptProfile.materialChecklist,
      openingRisks: scriptProfile.openingRisks,
      spoilerNotes: scriptProfile.spoilerNotes,
    });
    setScriptProfileOpen(true);
  };

  const triggerGenerateScriptProfile = async () => {
    if (!document) return;
    setScriptProfileLoading(true);
    try {
      const result = await generateScriptProfile(document.id);
      setScriptProfile(result);
      messageApi.success("剧本档案已生成");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "剧本档案生成失败");
    } finally {
      setScriptProfileLoading(false);
    }
  };

  const submitScriptProfile = async () => {
    if (!scriptProfile) return;
    setScriptProfileLoading(true);
    try {
      const values = await scriptProfileForm.validateFields();
      const result = await updateScriptProfile(scriptProfile.id, values);
      setScriptProfile(result);
      setScriptProfileOpen(false);
      messageApi.success("剧本档案已更新");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "剧本档案保存失败");
    } finally {
      setScriptProfileLoading(false);
    }
  };

  const confirmApproveScriptProfile = async () => {
    if (!scriptProfile) return;
    setScriptProfileLoading(true);
    try {
      const result = await approveScriptProfile(scriptProfile.id);
      setScriptProfile(result);
      messageApi.success("剧本档案已确认使用");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "确认使用失败");
    } finally {
      setScriptProfileLoading(false);
    }
  };

  const adoptMarketingResult = () => {
    if (!marketingResult?.assetId) return;
    setMarketingLoading(true);
    approveScriptMarketingAsset(marketingResult.assetId)
      .then((approved) => {
        setMarketingResult(approved);
        setMarketingVersions((current) => [approved, ...current.filter((item) => item.assetId !== approved.assetId)]);
        setMarketingOpen(false);
        messageApi.success("已确认为正式版本");
      })
      .catch((error) => {
        messageApi.error(error instanceof Error ? error.message : "确认使用失败");
      })
      .finally(() => setMarketingLoading(false));
  };

  const generateMarketingImages = (asset: ScriptMarketingAssetResult) => {
    if (!asset.assetId) return;
    setMarketingImageLoadingId(asset.assetId);
    generateScriptMarketingImages(asset.assetId, { includeCover: true, includeDetail: true })
      .then((updated) => {
        setMarketingResult((current) => (current?.assetId === updated.assetId ? updated : current));
        setMarketingVersions((current) => current.map((item) => (item.assetId === updated.assetId ? updated : item)));
        messageApi.success("AI 图片已生成，可在创建场次时直接带入");
      })
      .catch((error) => {
        messageApi.error(error instanceof Error ? error.message : "AI 图片生成失败");
      })
      .finally(() => setMarketingImageLoadingId(null));
  };

  const generateManual = async () => {
    if (!document) return;
    setOpeningManualLoading(true);
    try {
      const result = await generateOpeningManual(document.id, {
        style: "professional",
        targetDmLevel: "newbie",
        extraRequirement: "生成适合新手 DM 使用的专业主持人手册，重点包含开本准备、分幕流程、控场话术和风险提醒。",
      });
      setOpeningManualResult(result);
      setOpeningManualVersions((current) => [result, ...current.filter((item) => item.id !== result.id)]);
      if (result.status === "ready") {
        setOpeningManualOpen(true);
      }
      messageApi.success(result.status === "ready" ? "AI 主持人手册已生成" : "生成任务已创建，可稍后刷新查看结果");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "AI 主持人手册生成失败");
    } finally {
      setOpeningManualLoading(false);
    }
  };

  const openManualDetail = async (manualId: string) => {
    try {
      const result = await getOpeningManual(manualId);
      setOpeningManualResult(result);
      setOpeningManualOpen(true);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "主持人手册详情加载失败");
    }
  };

  const confirmDeleteManual = (manual: OpeningManualResult) => {
    modalApi.confirm({
      title: "确认删除这个主持人手册？",
      content: `将删除「${manual.title}」第 ${manual.manualVersionNo} 版。不会删除原始知识库资料。`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        setOpeningManualDeletingId(manual.id);
        try {
          await deleteOpeningManual(manual.id);
          setOpeningManualVersions((current) => current.filter((item) => item.id !== manual.id));
          if (openingManualResult?.id === manual.id) {
            setOpeningManualResult(null);
            setOpeningManualOpen(false);
          }
          messageApi.success("主持人手册已删除");
        } catch (error) {
          messageApi.error(error instanceof Error ? error.message : "主持人手册删除失败");
        } finally {
          setOpeningManualDeletingId(null);
        }
      },
    });
  };

  const reloadFile = async (record: KnowledgeManifestFile) => {
    if (!document?.activeVersionId) return;
    setReloadingFileId(record.fileId);
    try {
      const result = await loadKnowledgeFile(document.id, document.activeVersionId, record.fileId, createClientId());
      setParsedFiles((current) => {
        const others = current.filter((item) => item.fileId !== result.fileId);
        return [...others, result];
      });
      messageApi.success("文件重新加载完成");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "文件重新加载失败");
    } finally {
      setReloadingFileId(null);
    }
  };

  const deleteFile = async (record: KnowledgeManifestFile) => {
    if (!document?.activeVersionId) return;
    modalApi.confirm({
      title: "确认删除这个文件？",
      content: `将从当前版本中移除「${record.relativePath}」，相关解析结果、切片和向量索引也会一起清理。`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        setDeletingFileId(record.fileId);
        try {
          const result = await deleteKnowledgeFile(document.id, document.activeVersionId!, record.fileId);
          setParsedFiles(result.files);
          setManifest((current) => current
            ? { ...current, files: current.files.filter((item) => item.fileId !== record.fileId) }
            : current);
          setChunkResult(null);
          setEmbeddingResult(null);
          setRetrieveResults([]);
          messageApi.success("文件已删除");
        } catch (error) {
          messageApi.error(error instanceof Error ? error.message : "文件删除失败");
        } finally {
          setDeletingFileId(null);
        }
      },
    });
  };

  const openManualTextDrawer = (record: KnowledgeManifestFile) => {
    setManualTextFile(record);
    setManualText("");
  };

  const submitManualText = async () => {
    if (!document?.activeVersionId || !manualTextFile) return;
    if (!manualText.trim()) {
      messageApi.warning("请先粘贴文本内容");
      return;
    }
    setSavingManualText(true);
    try {
      const result = await saveManualParsedText(document.id, document.activeVersionId, manualTextFile.fileId, manualText);
      setParsedFiles((current) => {
        const others = current.filter((item) => item.fileId !== result.fileId);
        return [...others, result];
      });
      setChunkResult(null);
      setEmbeddingResult(null);
      setRetrieveResults([]);
      setManualTextFile(null);
      setManualText("");
      messageApi.success("补录文本已保存，请重新整理内容并建立 AI 索引");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "补录文本保存失败");
    } finally {
      setSavingManualText(false);
    }
  };

  const openMarkdown = async (parsedFileId: string) => {
    if (!document?.activeVersionId) return;
    try {
      const result = await getLoadedMarkdown(document.id, document.activeVersionId, parsedFileId);
      setPreview(result);
      setPreviewOpen(true);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "Markdown 读取失败");
    }
  };

  if (!loading && !document) {
    return (
      <div className="page-stack">
        {contextHolder}
        <Link href="/knowledge"><Button type="text" icon={<ArrowLeftOutlined />}>返回知识库</Button></Link>
        <Card className="surface-card"><Empty description="没有找到这个知识库资源" /></Card>
      </div>
    );
  }

  return (
    <div className="page-stack">
      {contextHolder}
      {modalContextHolder}
      <Space wrap>
        <Link href="/knowledge"><Button type="text" icon={<ArrowLeftOutlined />}>返回知识库</Button></Link>
        {document && (
          <Link href={buildUploadVersionHref(document)}>
            <Button type="primary" icon={<CloudUploadOutlined />}>上传新版本</Button>
          </Link>
        )}
      </Space>
      <Card className="surface-card" loading={loading}>
        <Space orientation="vertical" size={18} style={{ width: "100%" }}>
          <Space wrap>
            <Tag color={document?.resourceType === "script" ? "purple" : "blue"}>{document ? resourceLabels.get(document.resourceType) : "资源"}</Tag>
            {document?.scriptGenre && <Tag>{scriptGenreLabels.get(document.scriptGenre) ?? document.scriptGenre}</Tag>}
            <Tag color={manifest ? "success" : "processing"}>{manifest ? "文件已加载" : "等待上传完成"}</Tag>
          </Space>
          <div>
            <Typography.Title level={2} style={{ margin: 0 }}>{document?.name ?? "知识库资源"}</Typography.Title>
            {document?.description && <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>{document.description}</Typography.Paragraph>}
          </div>
          <Descriptions column={{ xs: 1, sm: 2 }} bordered>
            <Descriptions.Item label="当前版本">{document?.activeVersion ?? "暂无"}</Descriptions.Item>
            <Descriptions.Item label="版本 ID">{manifest?.versionId ?? document?.activeVersionId ?? "暂无"}</Descriptions.Item>
            <Descriptions.Item label="文件数量">{manifest?.files.length ?? document?.fileCount ?? 0}</Descriptions.Item>
            <Descriptions.Item label="总大小">{formatBytes(totalSize || document?.totalSize || 0)}</Descriptions.Item>
            <Descriptions.Item label="资源 ID">{document?.id}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{document ? new Date(document.updatedAt).toLocaleString("zh-CN") : "暂无"}</Descriptions.Item>
          </Descriptions>
        </Space>
      </Card>
      <Card className="surface-card" title="AI 可用状态" loading={loading}>
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          <Progress percent={pipelinePercent} strokeColor="#6d5dfc" />
          <Space orientation="vertical" size={4}>
            <Tag color={aiStatusColor}>{aiStatus}</Tag>
            <Typography.Text type="secondary">{aiStatusText}</Typography.Text>
          </Space>
          <Timeline
            items={ragSteps.map((step) => ({
              dot: (step.key === "loaded" && loadedDone) || (step.key === "chunked" && chunkDone) || (step.key === "vectorized" && embeddingDone)
                ? <CheckCircleOutlined style={{ color: "#3d9b86" }} />
                : step.icon,
              color: (step.key === "loaded" && loadedDone) || (step.key === "chunked" && chunkDone) || (step.key === "vectorized" && embeddingDone) ? "green" : "gray",
              children: (
                <Space>
                  <span>{step.title}</span>
                  <Tag>{(step.key === "loaded" && loadedDone) || (step.key === "chunked" && chunkDone) || (step.key === "vectorized" && embeddingDone) ? "完成" : "待处理"}</Tag>
                </Space>
              ),
            }))}
          />
          <Button type="primary" block loading={preparingAi} disabled={!document?.activeVersionId} onClick={prepareForAi}>
            {aiReady ? "重新整理给 AI 使用" : "一键整理给 AI 使用"}
          </Button>
          <Button block onClick={() => setShowProcessDetails((value) => !value)}>
            {showProcessDetails ? "收起处理详情" : "查看处理详情"}
          </Button>
        </Space>
      </Card>
      {document?.resourceType === "script" && (
        <Card className="surface-card" title="剧本档案">
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Typography.Text type="secondary">
              系统会从剧本资料中提炼人数、类型、卖点、角色、物料和开本风险。它是后续 AI 客服、主持人手册、宣传物料和创建场次的基础资料。
            </Typography.Text>
            {scriptProfile ? (
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Space wrap>
                  <Tag color={profileStatusLabels[scriptProfile.reviewStatus]?.color ?? "default"}>
                    {profileStatusLabels[scriptProfile.reviewStatus]?.label ?? scriptProfile.reviewStatus}
                  </Tag>
                  {scriptProfile.confidenceScore != null ? <Tag>完整度 {scriptProfile.confidenceScore} 分</Tag> : null}
                  {scriptProfile.genres.map((genre) => <Tag key={genre}>{genre}</Tag>)}
                </Space>
                <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                  <Descriptions.Item label="剧本名称">{scriptProfile.name}</Descriptions.Item>
                  <Descriptions.Item label="人数">
                    {scriptProfile.playerCountMin || scriptProfile.playerCountMax
                      ? `${scriptProfile.playerCountMin ?? "?"}-${scriptProfile.playerCountMax ?? "?"} 人`
                      : "暂无"}
                  </Descriptions.Item>
                  <Descriptions.Item label="时长">{scriptProfile.durationMinutes ? `${scriptProfile.durationMinutes} 分钟` : "暂无"}</Descriptions.Item>
                  <Descriptions.Item label="DM难度">{scriptProfile.dmDifficulty ?? "暂无"}</Descriptions.Item>
                </Descriptions>
                {scriptProfile.summary ? <Typography.Paragraph ellipsis={{ rows: 2 }}>{scriptProfile.summary}</Typography.Paragraph> : null}
                {scriptProfile.errorMessage ? <Typography.Text type="warning">{scriptProfile.errorMessage}</Typography.Text> : null}
                <Space wrap>
                  <Button type="primary" loading={scriptProfileLoading} onClick={openScriptProfileDrawer}>查看/编辑档案</Button>
                  <Button loading={scriptProfileLoading} disabled={scriptProfile.reviewStatus === "approved"} onClick={() => void confirmApproveScriptProfile()}>
                    确认使用
                  </Button>
                  <Button loading={scriptProfileLoading} disabled={!aiReady} onClick={() => void triggerGenerateScriptProfile()}>
                    重新生成
                  </Button>
                </Space>
              </Space>
            ) : (
              <Space direction="vertical" size={10}>
                <Typography.Text type="secondary">暂无剧本档案。完成“一键整理给 AI 使用”后，可以生成档案。</Typography.Text>
                <Button type="primary" loading={scriptProfileLoading} disabled={!aiReady} onClick={() => void triggerGenerateScriptProfile()}>
                  生成剧本档案
                </Button>
              </Space>
            )}
          </Space>
        </Card>
      )}
      {document?.resourceType === "script" && (
        <Card className="surface-card" title="AI 运营物料">
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Typography.Text type="secondary">
              基于当前剧本资料生成玩家可见的宣传标题、卖点、详情文案，以及主图/详情图 Prompt。生成结果仅作为草稿，需要店长确认后再使用。
            </Typography.Text>
            <Button
              type="primary"
              icon={<BulbOutlined />}
              loading={marketingLoading}
              disabled={!aiReady}
              onClick={() => void generateMarketing()}
            >
              AI 生成宣传物料
            </Button>
            {!aiReady ? <Typography.Text type="secondary">请先完成“一键整理给 AI 使用”，再生成宣传物料。</Typography.Text> : null}
            {marketingVersions.length ? (
              <Collapse
                size="small"
                items={marketingVersions.map((item, index) => ({
                  key: `${item.versionId}-${index}`,
                  label: `正式版本 ${marketingVersions.length - index}：${item.title}`,
                  children: (
                    <ScriptMarketingResult
                      result={item}
                      onGenerateImages={() => generateMarketingImages(item)}
                      generatingImages={marketingImageLoadingId === item.assetId}
                    />
                  ),
                }))}
              />
            ) : (
              <Typography.Text type="secondary">暂无正式版本。生成草稿后点击“确定使用”，会加入这里方便店长后续选择。</Typography.Text>
            )}
          </Space>
        </Card>
      )}
      {document?.resourceType === "script" && (
        <Card className="surface-card" title="AI 主持人手册">
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Typography.Text type="secondary">
              基于当前剧本资料生成 DM 可用的开本准备、分幕流程、控场话术和注意事项。当前先用于跑通生成链路，后续会接入正式 RAG 内容和店长审批。
            </Typography.Text>
            <Space wrap>
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                loading={openingManualLoading}
                disabled={!aiReady}
                onClick={() => void generateManual()}
              >
                生成主持人手册
              </Button>
              {openingManualResult ? (
                <Button onClick={() => setOpeningManualOpen(true)}>查看本次结果</Button>
              ) : null}
              <Button onClick={loadDetail}>刷新列表</Button>
            </Space>
            {!aiReady ? <Typography.Text type="secondary">请先完成“一键整理给 AI 使用”，再生成主持人手册。</Typography.Text> : null}
            {openingManualResult ? (
              <Space wrap>
                <Tag color={openingManualResult.status === "ready" ? "success" : "processing"}>{openingManualResult.status}</Tag>
                <Tag>第 {openingManualResult.manualVersionNo} 版</Tag>
                <Typography.Text>{openingManualResult.title}</Typography.Text>
              </Space>
            ) : (
              <Typography.Text type="secondary">暂无生成记录。点击按钮后，会调用刚才新增的创建任务接口。</Typography.Text>
            )}
            <Table<OpeningManualResult>
              rowKey="id"
              size="small"
              tableLayout="fixed"
              pagination={false}
              dataSource={openingManualVersions}
              locale={{ emptyText: <Empty description="暂无主持人手册版本" /> }}
              scroll={{ x: 760 }}
              columns={[
                { title: "版本", dataIndex: "manualVersionNo", width: 80, render: (value) => <Tag>第 {value} 版</Tag> },
                { title: "标题", dataIndex: "title", width: 240, ellipsis: true, render: (title) => <EllipsisText value={title} /> },
                { title: "状态", dataIndex: "status", width: 100, render: (status) => <Tag color={status === "ready" ? "success" : status === "failed" ? "error" : "processing"}>{status}</Tag> },
                { title: "适用", dataIndex: "targetDmLevel", width: 100, render: (value) => <Tag>{value === "newbie" ? "新手DM" : "老手DM"}</Tag> },
                { title: "创建时间", dataIndex: "createdAt", width: 180, render: (value) => new Date(value).toLocaleString("zh-CN") },
                {
                  title: "操作",
                  width: 150,
                  fixed: "right",
                  render: (_, record) => (
                    <Space size={4}>
                      <Button type="text" size="small" onClick={() => void openManualDetail(record.id)}>详情</Button>
                      <Button
                        type="text"
                        danger
                        size="small"
                        loading={openingManualDeletingId === record.id}
                        onClick={() => confirmDeleteManual(record)}
                      >
                        删除
                      </Button>
                    </Space>
                  ),
                },
              ]}
            />
          </Space>
        </Card>
      )}
      {showProcessDetails && <Card className={`surface-card ${styles.detailTabsCard}`}>
        <Tabs
          items={[
            {
              key: "files",
              label: "文件识别",
              children: (
                <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                  <Space style={{ alignItems: "flex-start", justifyContent: "space-between", width: "100%" }} wrap>
                    <Space orientation="vertical" size={6} style={{ flex: 1, minWidth: 260, maxWidth: 520 }}>
                      <Typography.Text type="secondary">
                        文件识别进度：已识别 {loadedReadyCount} / {files.length}
                        {loadedSkippedCount ? `，待转换 ${loadedSkippedCount} 个` : ""}
                        {filteredFiles.length !== files.length ? `，当前展示 ${filteredFiles.length} 个` : ""}
                      </Typography.Text>
                      <Progress percent={loadedPercent} showInfo={false} strokeColor="#6d5dfc" />
                    </Space>
                    <Button type="primary" icon={<PlayCircleOutlined />} loading={loadingDocuments} disabled={!document?.activeVersionId} onClick={confirmLoadAllDocuments}>识别文件</Button>
                  </Space>
                  <Space wrap>
                    <Input.Search
                      allowClear
                      placeholder="搜索文件名/路径"
                      value={fileKeyword}
                      onChange={(event) => setFileKeyword(event.target.value)}
                      style={{ width: 240 }}
                    />
                    <Select<FileStatusFilter>
                      value={fileStatusFilter}
                      options={fileStatusOptions}
                      onChange={setFileStatusFilter}
                      style={{ width: 140 }}
                    />
                    <Button icon={<ReloadOutlined />} loading={loading} onClick={loadDetail}>刷新</Button>
                    <Button onClick={() => { setFileKeyword(""); setFileStatusFilter("all"); }}>重置</Button>
                  </Space>
                  <Table<KnowledgeManifestFile>
                    rowKey="clientFileId"
                    tableLayout="fixed"
                    className={styles.resourceTable}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 1120 }}
                    dataSource={filteredFiles}
                    loading={loading}
                    columns={[
                      { title: "相对路径", dataIndex: "relativePath", width: 320, ellipsis: true, render: (path) => <EllipsisText value={path} copyable /> },
                      { title: "类型", dataIndex: "contentType", width: 180, ellipsis: true, render: (type) => <EllipsisText value={type} /> },
                      { title: "大小", dataIndex: "size", width: 110, render: formatBytes },
                      { title: "加载状态", width: 120, render: (_, record) => {
                        const parsed = parsedByPath.get(record.relativePath);
                        const status = parsed?.status ?? "not_loaded";
                        const color = status === "ready" ? "success" : status === "failed" ? "error" : status === "skipped" ? "warning" : status === "not_loaded" || status === "pending" ? "default" : "processing";
                        const label = status === "ready" ? "完成" : status === "failed" ? "失败" : status === "skipped" ? "待转换" : status === "not_loaded" ? "未加载" : status === "pending" ? "待处理" : "处理中";
                        return <Tag color={color}>{label}</Tag>;
                      } },
                      { title: "字符数", width: 90, render: (_, record) => parsedByPath.get(record.relativePath)?.charCount ?? 0 },
                      { title: "图片资产", width: 100, render: (_, record) => parsedByPath.get(record.relativePath)?.assetCount ?? 0 },
                      { title: "错误原因", width: 220, ellipsis: true, render: (_, record) => <EllipsisText value={parsedByPath.get(record.relativePath)?.errorMessage ?? "无"} /> },
                      { title: "SHA256", dataIndex: "sha256", width: 180, ellipsis: true, render: (value) => <EllipsisText value={shortHash(value)} /> },
                      { title: "操作", width: 300, fixed: "right", align: "left", render: (_, record) => {
                        const parsed = parsedByPath.get(record.relativePath);
                        const canManualInput = parsed?.status === "failed" || parsed?.status === "skipped" || !parsed;
                        return (
                          <Space size={4} className={`${styles.actions} ${styles.actionsLeft}`}>
                            <Button type="text" size="small" icon={<EyeOutlined />} disabled={parsed?.status !== "ready" || !parsed.id} className={styles.actionButton} onClick={() => parsed?.id && openMarkdown(parsed.id)}>预览</Button>
                            {canManualInput && (
                              <Button
                                type="text"
                                size="small"
                                icon={<FormOutlined />}
                                className={styles.actionButton}
                                disabled={!document?.activeVersionId || loadingDocuments}
                                onClick={() => openManualTextDrawer(record)}
                              >
                                补录文本
                              </Button>
                            )}
                            <Button
                              type="text"
                              size="small"
                              icon={<ReloadOutlined />}
                              className={styles.actionButton}
                              loading={reloadingFileId === record.fileId}
                              disabled={!document?.activeVersionId || loadingDocuments}
                              onClick={() => reloadFile(record)}
                            >
                              重新加载
                            </Button>
                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              className={styles.actionButton}
                              loading={deletingFileId === record.fileId}
                              disabled={!document?.activeVersionId || loadingDocuments}
                              onClick={() => deleteFile(record)}
                            >
                              删除
                            </Button>
                          </Space>
                        );
                      } },
                    ]}
                  />
                </Space>
              ),
            },
            {
              key: "chunks",
              label: "内容整理",
              children: (
                <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                  <Row gutter={[16, 16]}>
                    <Col xs={12} md={6}><Card><Statistic title="总 Chunk" value={chunkResult?.totalChunks ?? 0} /></Card></Col>
                    <Col xs={12} md={6}><Card><Statistic title="已切片文件" value={`${chunkResult?.chunkedFiles ?? 0}/${chunkResult?.totalFiles ?? files.length}`} /></Card></Col>
                    <Col xs={12} md={6}><Card><Statistic title="任务块" value={chunkResult?.typeCounts.task ?? 0} /></Card></Col>
                    <Col xs={12} md={6}><Card><Statistic title="规则块" value={chunkResult?.typeCounts.rule ?? 0} /></Card></Col>
                  </Row>
                  <Space style={{ justifyContent: "space-between", width: "100%" }} wrap>
                    <Typography.Text type="secondary">按文件聚合展示，点击“查看切片”再下钻到具体 chunk。</Typography.Text>
                    <Button type="primary" icon={<ScissorOutlined />} loading={chunking} disabled={!document?.activeVersionId || loadedReadyCount === 0} onClick={triggerChunk}>整理内容</Button>
                  </Space>
                  <Table<KnowledgeChunkFileSummary>
                    rowKey="fileId"
                    tableLayout="fixed"
                    className={styles.resourceTable}
                    scroll={{ x: 960 }}
                    pagination={{ pageSize: 8 }}
                    dataSource={chunkResult?.files ?? []}
                    locale={{ emptyText: <Empty description="暂无切片，先完成文件加载后点击生成切片" /> }}
                    columns={[
                      { title: "文件", dataIndex: "relativePath", width: 320, ellipsis: true, render: (path) => <EllipsisText value={path} /> },
                      { title: "角色/来源", dataIndex: "roleName", width: 120, ellipsis: true, render: (role) => <EllipsisText value={role ?? "未识别"} /> },
                      { title: "幕", dataIndex: "acts", width: 180, render: (acts: string[]) => acts.length ? acts.map((act) => <Tag key={act}>{act}</Tag>) : "暂无" },
                      { title: "Chunk", dataIndex: "chunkCount", width: 90 },
                      { title: "类型分布", dataIndex: "typeCounts", width: 220, render: (counts: Record<string, number>) => (
                        <Space size={4} wrap={false}>
                          {Object.entries(counts).map(([type, count]) => <Tag key={type}>{chunkTypeLabels[type] ?? type} {count}</Tag>)}
                        </Space>
                      ) },
                      { title: "状态", dataIndex: "status", width: 90, render: () => <Tag color="success">完成</Tag> },
                      { title: "操作", width: 120, fixed: "right", align: "left", render: (_, record) => (
                        <Button type="text" size="small" icon={<EyeOutlined />} className={styles.actionButton} onClick={() => setChunkDrawerFile(record)}>查看切片</Button>
                      ) },
                    ]}
                  />
                </Space>
              ),
            },
            {
              key: "vectors",
              label: "AI 索引",
              children: (
                <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                  <Row gutter={[16, 16]}>
                    <Col xs={12} md={6}><Card><Statistic title="总 Chunk" value={embeddingResult?.totalChunks ?? chunkResult?.totalChunks ?? 0} /></Card></Col>
                    <Col xs={12} md={6}><Card><Statistic title="已向量化" value={embeddingResult?.embeddedChunks ?? 0} /></Card></Col>
                    <Col xs={12} md={6}><Card><Statistic title="待处理" value={embeddingResult?.pendingChunks ?? chunkResult?.totalChunks ?? 0} /></Card></Col>
                    <Col xs={12} md={6}><Card><Statistic title="失败" value={embeddingResult?.failedChunks ?? 0} /></Card></Col>
                  </Row>
                  <Card>
                    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
                      <Space style={{ justifyContent: "space-between", width: "100%" }} wrap>
                        <Space orientation="vertical" size={4}>
                          <Typography.Text>Embedding 模型：{embeddingResult?.model ?? "text-embedding-v4"}</Typography.Text>
                          <Typography.Text type="secondary">维度：{embeddingResult?.dimension ?? 1024}，内容未变化的 chunk 会自动跳过。</Typography.Text>
                        </Space>
                        <Button type="primary" icon={<ClusterOutlined />} loading={embedding} disabled={!document?.activeVersionId || !(chunkResult?.totalChunks || embeddingResult?.totalChunks)} onClick={triggerEmbedding}>建立 AI 索引</Button>
                      </Space>
                      <Progress
                        percent={embeddingResult?.totalChunks ? Math.round((embeddingResult.embeddedChunks / embeddingResult.totalChunks) * 100) : 0}
                        showInfo
                        strokeColor="#6d5dfc"
                      />
                    </Space>
                  </Card>
                </Space>
              ),
            },
            {
              key: "retrieval",
              label: "检索测试",
              children: (
                <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                  <Card>
                    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
                      <Typography.Text type="secondary">这里可以测试 BM25、向量和混合召回效果。混合模式先用 RRF 融合候选；如果后端开启 RERANK_ENABLED，会继续精排后返回。</Typography.Text>
                      <Space.Compact style={{ width: "100%" }}>
                        <Select<KnowledgeRetrieveMode>
                          value={retrieveMode}
                          style={{ width: 130 }}
                          options={[
                            { label: "混合 RRF", value: "hybrid" },
                            { label: "BM25", value: "bm25" },
                            { label: "向量", value: "vector" },
                          ]}
                          onChange={setRetrieveMode}
                        />
                        <Input.Search
                          value={retrieveQuery}
                          placeholder="例如：侄女第一幕任务是什么？"
                          enterButton="检索"
                          loading={retrieving}
                          onChange={(event) => setRetrieveQuery(event.target.value)}
                          onSearch={triggerRetrieve}
                        />
                      </Space.Compact>
                    </Space>
                  </Card>
                  <Table<KnowledgeRetrievedChunk>
                    rowKey="chunkId"
                    tableLayout="fixed"
                    className={styles.resourceTable}
                    scroll={{ x: 1080 }}
                    pagination={{ pageSize: 6 }}
                    dataSource={retrieveResults}
                    locale={{ emptyText: <Empty description="输入问题后可测试 BM25 / 向量 / 混合检索结果" /> }}
                    columns={[
                      { title: "来源文件", dataIndex: "relativePath", width: 280, ellipsis: true, render: (path) => <EllipsisText value={path} /> },
                      { title: "幕", dataIndex: "act", width: 100, render: (act) => act ? <Tag>{act}</Tag> : "暂无" },
                      { title: "类型", dataIndex: "chunkType", width: 120, render: (type) => <Tag color="purple">{chunkTypeLabels[type] ?? type}</Tag> },
                      { title: "标题", dataIndex: "title", width: 180, ellipsis: true, render: (title) => <EllipsisText value={title ?? "无标题"} /> },
                      { title: "分数", dataIndex: "score", width: 100, render: (score: number) => score.toFixed(4) },
                      { title: "召回", dataIndex: "scoreType", width: 110, render: (type) => <Tag color={type === "bm25" ? "blue" : type === "vector" ? "green" : type === "rerank" ? "magenta" : "gold"}>{type === "rrf" ? "RRF" : type === "rerank" ? "精排" : type}</Tag> },
                      { title: "内容", dataIndex: "content", width: 300, ellipsis: true, render: (content) => <EllipsisText value={content} /> },
                    ]}
                  />
                </Space>
              ),
            },
          ]}
        />
      </Card>}
      <Drawer title={preview?.relativePath ?? "Markdown 预览"} width={720} open={previewOpen} onClose={() => setPreviewOpen(false)}>
        <Typography.Paragraph copyable={{ text: preview?.markdown ?? "" }} style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-mono), monospace" }}>
          {preview?.markdown ? renderMarkdownWithAssets(preview.markdown, assetUrls) : ""}
        </Typography.Paragraph>
      </Drawer>
      <Drawer title={chunkDrawerFile?.relativePath ?? "切片详情"} width={760} open={!!chunkDrawerFile} onClose={() => setChunkDrawerFile(null)}>
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          <Space wrap>
            <Tag color="blue">{chunkDrawerFile?.roleName ?? "未识别角色"}</Tag>
            <Tag>{chunksForDrawer.length} chunks</Tag>
          </Space>
          <Collapse
            items={chunksForDrawer.map((chunk: KnowledgeChunk) => ({
              key: chunk.id,
              label: (
                <Space wrap>
                  <Tag>{chunk.act ?? "未分幕"}</Tag>
                  <Tag color="purple">{chunkTypeLabels[chunk.chunkType] ?? chunk.chunkType}</Tag>
                  <span>{chunk.title ?? `Chunk ${chunk.chunkIndex + 1}`}</span>
                  <Typography.Text type="secondary">{chunk.charCount} 字</Typography.Text>
                </Space>
              ),
              children: (
                <Typography.Paragraph copyable style={{ whiteSpace: "pre-wrap" }}>
                  {chunk.content}
                </Typography.Paragraph>
              ),
            }))}
          />
        </Space>
      </Drawer>
      <Drawer title="AI 运营物料草稿" width={760} open={marketingOpen} onClose={() => setMarketingOpen(false)}>
        {marketingResult ? (
          <ScriptMarketingResult
            result={marketingResult}
            onAdopt={adoptMarketingResult}
            onRegenerate={() => setMarketingFeedbackOpen(true)}
            onGenerateImages={() => generateMarketingImages(marketingResult)}
            adopting={false}
            regenerating={marketingLoading}
            generatingImages={marketingImageLoadingId === marketingResult.assetId}
          />
        ) : null}
      </Drawer>
      <Drawer
        title="剧本档案"
        width={780}
        open={scriptProfileOpen}
        onClose={() => setScriptProfileOpen(false)}
        extra={<Button type="primary" loading={scriptProfileLoading} onClick={() => void submitScriptProfile()}>保存</Button>}
      >
        <Form form={scriptProfileForm} layout="vertical">
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="name" label="剧本名称" rules={[{ required: true, message: "请输入剧本名称" }]}>
                <Input placeholder="例如：捉小三" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="genres" label="剧本类型">
                <Select mode="tags" placeholder="例如：欢乐、机制、变格" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="playerCountMin" label="最少人数">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="playerCountMax" label="最多人数">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="durationMinutes" label="时长/分钟">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="dmDifficulty" label="DM难度">
                <Input placeholder="例如：新手可开" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="aliasNames" label="别名">
            <Select mode="tags" placeholder="输入后回车，例如：窃听风云之捉小三" />
          </Form.Item>
          <Form.Item name="difficulty" label="玩家难度">
            <Input placeholder="例如：新手友好、进阶、硬核" />
          </Form.Item>
          <Form.Item name="summary" label="玩家可见简介">
            <Input.TextArea rows={3} placeholder="不要剧透，适合展示在玩家端详情页" />
          </Form.Item>
          <Form.Item name="storyBackground" label="故事背景">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="truthSummary" label="真相摘要（后台/DM可见）">
            <Input.TextArea rows={4} placeholder="这里可以包含剧透，后续仅给后台/DM 使用" />
          </Form.Item>
          <Form.Item name="sellingPoints" label="玩家卖点">
            <Select mode="tags" placeholder="输入后回车，例如：欢乐撕逼、机制丰富" />
          </Form.Item>
          <Form.Item name="suitablePlayers" label="适合玩家">
            <Select mode="tags" placeholder="输入后回车，例如：熟人局、团建、新手" />
          </Form.Item>
          <Form.Item name="coreMechanics" label="核心机制">
            <Select mode="tags" placeholder="输入后回车" />
          </Form.Item>
          <Form.Item name="materialChecklist" label="物料清单">
            <Select mode="tags" placeholder="输入后回车" />
          </Form.Item>
          <Form.Item name="openingRisks" label="开本风险">
            <Select mode="tags" placeholder="输入后回车" />
          </Form.Item>
          <Form.Item name="spoilerNotes" label="剧透注意事项">
            <Select mode="tags" placeholder="输入后回车" />
          </Form.Item>
          {scriptProfile?.sources.length ? (
            <Card size="small" title="引用来源">
              <Space wrap>
                {scriptProfile.sources.map((source) => <Tag key={source}>{source}</Tag>)}
              </Space>
            </Card>
          ) : null}
        </Form>
      </Drawer>
      <Drawer
        title={openingManualResult?.title ?? "AI 主持人手册"}
        width={820}
        open={openingManualOpen}
        onClose={() => setOpeningManualOpen(false)}
      >
        {openingManualResult ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Space wrap>
              <Tag color={openingManualResult.status === "ready" ? "success" : "processing"}>{openingManualResult.status}</Tag>
              <Tag>第 {openingManualResult.manualVersionNo} 版</Tag>
              <Tag>{openingManualResult.targetDmLevel}</Tag>
              <Tag>{openingManualResult.style}</Tag>
            </Space>
            <Card size="small" title="AI 总体验收">
              {validationNumber(manualOverallValidation(openingManualResult.validationResult), "score") == null ? (
                <Typography.Text type="secondary">暂无审核结果，可能是旧版本手册或后台仍在生成中。</Typography.Text>
              ) : (
                <Space direction="vertical" size={14} style={{ width: "100%" }}>
                  <Space wrap>
                    <Tag color={manualOverallValidation(openingManualResult.validationResult).passed ? "success" : "warning"}>
                      {manualOverallValidation(openingManualResult.validationResult).passed ? "审核通过" : "需要人工确认"}
                    </Tag>
                    <Typography.Text>
                      总体分数：{percentValue(validationNumber(manualOverallValidation(openingManualResult.validationResult), "score"))} 分
                    </Typography.Text>
                    {validationText(manualOverallValidation(openingManualResult.validationResult), "reason") ? (
                      <Typography.Text type="secondary">{validationText(manualOverallValidation(openingManualResult.validationResult), "reason")}</Typography.Text>
                    ) : null}
                  </Space>
                  <Row gutter={[12, 12]}>
                    {[
                      ["completeness", "完整度"],
                      ["actionability", "可执行性"],
                      ["faithfulness", "资料忠实度"],
                      ["spoilerSafety", "剧透安全"],
                    ].map(([key, label]) => (
                      <Col xs={24} sm={12} key={key}>
                        <Typography.Text type="secondary">{label}</Typography.Text>
                        <Progress percent={percentValue(validationNumber(manualOverallValidation(openingManualResult.validationResult), key))} size="small" />
                      </Col>
                    ))}
                  </Row>
                  {[
                    ["missingSections", "缺失内容"],
                    ["riskNotes", "风险提醒"],
                    ["suggestions", "优化建议"],
                  ].map(([key, title]) => {
                    const items = validationStringList(manualOverallValidation(openingManualResult.validationResult), key);
                    return items.length ? (
                      <div key={key}>
                        <Typography.Text strong>{title}</Typography.Text>
                        <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
                          {items.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                      </div>
                    ) : null;
                  })}
                </Space>
              )}
            </Card>
            {Object.keys(manualScriptFacts(openingManualResult.validationResult)).length ? (
              <Card size="small" title="全局事实锚点">
                <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                  <Descriptions.Item label="剧本名称">{validationText(manualScriptFacts(openingManualResult.validationResult), "scriptName") || "暂无"}</Descriptions.Item>
                  <Descriptions.Item label="人数">{validationText(manualScriptFacts(openingManualResult.validationResult), "playerCount") || "暂无"}</Descriptions.Item>
                  <Descriptions.Item label="时长">{validationText(manualScriptFacts(openingManualResult.validationResult), "duration") || "暂无"}</Descriptions.Item>
                  <Descriptions.Item label="类型">{validationText(manualScriptFacts(openingManualResult.validationResult), "genre") || "暂无"}</Descriptions.Item>
                </Descriptions>
                {[
                  ["coreMechanics", "核心机制"],
                  ["keyRelationships", "关键人物关系"],
                  ["timeline", "关键时间线"],
                  ["endingConditions", "结局/结算条件"],
                  ["spoilerWarnings", "剧透隔离提醒"],
                  ["conflicts", "冲突信息"],
                  ["unknowns", "需人工确认"],
                ].map(([key, title]) => {
                  const items = validationStringList(manualScriptFacts(openingManualResult.validationResult), key);
                  return items.length ? (
                    <div key={key} style={{ marginTop: 12 }}>
                      <Typography.Text strong>{title}</Typography.Text>
                      <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
                        {items.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  ) : null;
                })}
              </Card>
            ) : null}
            <Card size="small" title="Markdown 预览">
              <XMarkdown
                content={openingManualResult.markdown ?? openingManualResult.markdownPreview ?? "暂无内容"}
                openLinksInNewTab
                escapeRawHtml
              />
            </Card>
          </Space>
        ) : null}
      </Drawer>
      <Modal
        title="填写店长修改意见"
        open={marketingFeedbackOpen}
        okText="按意见重新生成"
        cancelText="取消"
        confirmLoading={marketingLoading}
        onCancel={() => setMarketingFeedbackOpen(false)}
        onOk={() => void generateMarketing(marketingFeedback)}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Text type="secondary">
            例如：更欢乐一点、不要太悬疑、突出新手友好、主图更高级、详情文案短一点。
          </Typography.Text>
          <Input.TextArea
            rows={5}
            value={marketingFeedback}
            onChange={(event) => setMarketingFeedback(event.target.value)}
            placeholder="请输入店长的修改意见..."
          />
        </Space>
      </Modal>
      <Drawer
        title={manualTextFile ? `补录文本：${manualTextFile.relativePath}` : "补录文本"}
        width={720}
        open={!!manualTextFile}
        onClose={() => setManualTextFile(null)}
        extra={(
          <Space>
            <Button onClick={() => setManualTextFile(null)}>取消</Button>
            <Button type="primary" loading={savingManualText} onClick={submitManualText}>保存</Button>
          </Space>
        )}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Text type="secondary">
            适合 .doc 旧版 Word、扫描不准或解析失败的文件。把正文复制到这里后，系统会把它保存为 Markdown，并用于后续切片、向量化和 RAG 检索。
          </Typography.Text>
          <Input.TextArea
            value={manualText}
            onChange={(event) => setManualText(event.target.value)}
            rows={18}
            showCount
            maxLength={500000}
            placeholder="请粘贴从 Word/WPS 中复制出来的正文内容..."
          />
        </Space>
      </Drawer>
    </div>
  );
}
