"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftOutlined,
  BranchesOutlined,
  CheckCircleOutlined,
  ClusterOutlined,
  EyeOutlined,
  FileTextOutlined,
  NodeIndexOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  ScissorOutlined,
} from "@ant-design/icons";
import { Button, Card, Col, Collapse, Descriptions, Drawer, Empty, Image, Input, Modal, Progress, Row, Select, Space, Statistic, Table, Tabs, Tag, Timeline, Tooltip, Typography, message } from "antd";
import { chunkKnowledgeDocument, embedKnowledgeChunks, getAssetPreviewUrl, getKnowledgeManifest, getLoadedMarkdown, listKnowledgeChunks, listKnowledgeDocuments, listKnowledgeEmbeddings, listLoadedFiles, loadKnowledgeDocument, loadKnowledgeFile, retrieveKnowledgeChunks } from "@/lib/oss/knowledge-resource-api";
import { useIdempotencyKey } from "@/lib/hooks/use-idempotency-key";
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
  { key: "loaded", title: "文件加载", icon: <FileTextOutlined />, done: true },
  { key: "chunked", title: "切片", icon: <BranchesOutlined />, done: false },
  { key: "vectorized", title: "向量化", icon: <ClusterOutlined />, done: false },
  { key: "retrieval", title: "召回测试", icon: <NodeIndexOutlined />, done: false },
];

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
  const [reloadingFileId, setReloadingFileId] = useState<string | null>(null);
  const [assetUrls, setAssetUrls] = useState<Map<string, string>>(new Map());
  const [messageApi, contextHolder] = message.useMessage();
  const loadAllIdempotency = useIdempotencyKey([document?.id, document?.activeVersionId, "load-all"]);
  const chunkIdempotency = useIdempotencyKey([document?.id, document?.activeVersionId, "chunk"]);
  const embeddingIdempotency = useIdempotencyKey([document?.id, document?.activeVersionId, "embedding"]);
  const [modalApi, modalContextHolder] = Modal.useModal();

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const documents = await listKnowledgeDocuments({ pageSize: 100 });
        const current = documents.items.find((item) => item.id === documentId) ?? null;
        if (!current) {
          if (mounted) setDocument(null);
          return;
        }
        const detail = current.activeVersionId ? await getKnowledgeManifest(current.id, current.activeVersionId) : null;
        const loaded = current.activeVersionId ? await listLoadedFiles(current.id, current.activeVersionId) : null;
        const chunks = current.activeVersionId ? await listKnowledgeChunks(current.id, current.activeVersionId) : null;
        const embeddings = current.activeVersionId ? await listKnowledgeEmbeddings(current.id, current.activeVersionId) : null;
        if (mounted) {
          setDocument(current);
          setManifest(detail);
          setParsedFiles(loaded?.files ?? []);
          setChunkResult(chunks);
          setEmbeddingResult(embeddings);
        }
      } catch (error) {
        messageApi.error(error instanceof Error ? error.message : "知识库详情加载失败");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [documentId, messageApi]);

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
  const loadedPercent = files.length ? Math.round((loadedReadyCount / files.length) * 100) : 0;
  const completedSteps = loadedPercent === 100 ? ragSteps.filter((step) => step.done).length : 0;
  const pipelinePercent = Math.round((completedSteps / ragSteps.length) * 100);
  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);
  const parsedByPath = useMemo(() => new Map(parsedFiles.map((file) => [file.relativePath, file])), [parsedFiles]);
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

  const reloadFile = async (record: KnowledgeManifestFile) => {
    if (!document?.activeVersionId) return;
    setReloadingFileId(record.fileId);
    try {
      const result = await loadKnowledgeFile(document.id, document.activeVersionId, record.fileId, crypto.randomUUID());
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
      <Link href="/knowledge"><Button type="text" icon={<ArrowLeftOutlined />}>返回知识库</Button></Link>
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={16}>
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
        </Col>
        <Col xs={24} lg={8}>
          <Card className="surface-card" title="RAG 进度" loading={loading}>
            <Space orientation="vertical" size={16} style={{ width: "100%" }}>
              <Progress percent={pipelinePercent} strokeColor="#6d5dfc" />
              <Timeline
                items={ragSteps.map((step) => ({
                  dot: step.done ? <CheckCircleOutlined style={{ color: "#3d9b86" }} /> : step.icon,
                  color: step.done ? "green" : "gray",
                  children: <Space><span>{step.title}</span><Tag>{step.done ? "完成" : "待处理"}</Tag></Space>,
                }))}
              />
            </Space>
          </Card>
        </Col>
      </Row>
      <Card className="surface-card">
        <Tabs
          items={[
            {
              key: "files",
              label: "文件加载",
              children: (
                <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                  <Space style={{ alignItems: "flex-start", justifyContent: "space-between", width: "100%" }} wrap>
                    <Space orientation="vertical" size={6} style={{ flex: 1, minWidth: 260, maxWidth: 520 }}>
                      <Typography.Text type="secondary">文档加载进度：已加载 {loadedReadyCount} / {files.length}</Typography.Text>
                      <Progress percent={loadedPercent} showInfo={false} strokeColor="#6d5dfc" />
                    </Space>
                    <Button type="primary" icon={<PlayCircleOutlined />} loading={loadingDocuments} disabled={!document?.activeVersionId} onClick={confirmLoadAllDocuments}>加载文档</Button>
                  </Space>
                  <Table<KnowledgeManifestFile>
                    rowKey="clientFileId"
                    tableLayout="fixed"
                    className={styles.resourceTable}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 1120 }}
                    dataSource={files}
                    loading={loading}
                    columns={[
                      { title: "相对路径", dataIndex: "relativePath", width: 320, ellipsis: true, render: (path) => <EllipsisText value={path} copyable /> },
                      { title: "类型", dataIndex: "contentType", width: 180, ellipsis: true, render: (type) => <EllipsisText value={type} /> },
                      { title: "大小", dataIndex: "size", width: 110, render: formatBytes },
                      { title: "加载状态", width: 120, render: (_, record) => {
                        const parsed = parsedByPath.get(record.relativePath);
                        const status = parsed?.status ?? "pending";
                        const color = status === "ready" ? "success" : status === "failed" ? "error" : "processing";
                        const label = status === "ready" ? "完成" : status === "failed" ? "失败" : "待加载";
                        return <Tag color={color}>{label}</Tag>;
                      } },
                      { title: "字符数", width: 90, render: (_, record) => parsedByPath.get(record.relativePath)?.charCount ?? 0 },
                      { title: "图片资产", width: 100, render: (_, record) => parsedByPath.get(record.relativePath)?.assetCount ?? 0 },
                      { title: "错误原因", width: 220, ellipsis: true, render: (_, record) => <EllipsisText value={parsedByPath.get(record.relativePath)?.errorMessage ?? "无"} /> },
                      { title: "SHA256", dataIndex: "sha256", width: 180, ellipsis: true, render: (value) => <EllipsisText value={shortHash(value)} /> },
                      { title: "操作", width: 168, fixed: "right", align: "right", render: (_, record) => {
                        const parsed = parsedByPath.get(record.relativePath);
                        return (
                          <Space size={4} className={styles.actions}>
                            <Button type="text" size="small" icon={<EyeOutlined />} disabled={parsed?.status !== "ready"} className={styles.actionButton} onClick={() => parsed && openMarkdown(parsed.id)}>预览</Button>
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
              label: "切片",
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
                    <Button type="primary" icon={<ScissorOutlined />} loading={chunking} disabled={!document?.activeVersionId || loadedReadyCount === 0} onClick={triggerChunk}>生成切片</Button>
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
                      { title: "操作", width: 120, fixed: "right", align: "right", render: (_, record) => (
                        <Button type="text" size="small" icon={<EyeOutlined />} className={styles.actionButton} onClick={() => setChunkDrawerFile(record)}>查看切片</Button>
                      ) },
                    ]}
                  />
                </Space>
              ),
            },
            {
              key: "vectors",
              label: "向量化",
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
                        <Button type="primary" icon={<ClusterOutlined />} loading={embedding} disabled={!document?.activeVersionId || !(chunkResult?.totalChunks || embeddingResult?.totalChunks)} onClick={triggerEmbedding}>生成向量</Button>
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
              label: "召回测试",
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
      </Card>
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
    </div>
  );
}
