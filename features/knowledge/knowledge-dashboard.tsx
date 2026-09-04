"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClearOutlined, CloudUploadOutlined, DeleteOutlined, EyeOutlined, FilePdfOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Input, Modal, Progress, Select, Space, Table, Tag, Tooltip, Typography, message } from "antd";
import { deleteKnowledgeDocument, listKnowledgeDocuments } from "@/lib/oss/knowledge-resource-api";
import { KNOWLEDGE_RESOURCE_OPTIONS, SCRIPT_GENRE_OPTIONS, type KnowledgeDocumentListItem, type KnowledgeResourceType } from "@/lib/oss/knowledge-resource-types";
import styles from "./knowledge-dashboard.module.css";

const resourceLabels = new Map(KNOWLEDGE_RESOURCE_OPTIONS.map((item) => [item.value, item.label]));
const scriptGenreLabels = new Map(SCRIPT_GENRE_OPTIONS.map((item) => [item.value, item.label]));
const aiStatusColor = new Map([
  ["ready", "success"],
  ["processing", "processing"],
  ["partial_error", "error"],
  ["not_ready", "default"],
]);

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function EllipsisText({ value }: { value?: React.ReactNode }) {
  const text = value == null || value === "" ? "暂无" : String(value);
  return (
    <Tooltip title={<div className={styles.ellipsisTooltip}>{text}</div>}>
      <span className={styles.ellipsisText}>{text}</span>
    </Tooltip>
  );
}

export function KnowledgeDashboard() {
  const [rows, setRows] = useState<KnowledgeDocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [resourceType, setResourceType] = useState<KnowledgeResourceType | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [messageApi, contextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const readyCount = useMemo(() => rows.filter((item) => item.aiStatus === "ready").length, [rows]);
  const errorCount = useMemo(() => rows.filter((item) => item.aiStatus === "partial_error").length, [rows]);
  const pendingCount = useMemo(() => rows.filter((item) => item.aiStatus !== "ready" && item.aiStatus !== "partial_error").length, [rows]);
  const readyPercent = rows.length ? Math.round((readyCount / rows.length) * 100) : 0;

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listKnowledgeDocuments({
        keyword,
        resourceType,
        page,
        pageSize,
      });
      setRows(result.items);
      setTotal(result.meta.total);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "知识库资源加载失败");
    } finally {
      setLoading(false);
    }
  }, [keyword, messageApi, page, pageSize, resourceType]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDocuments();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDocuments]);

  const confirmDelete = (record: KnowledgeDocumentListItem) => {
    modalApi.confirm({
      title: `删除「${record.name}」？`,
      content: "删除后该资源不会继续出现在知识库列表，也不会作为当前 RAG 资源使用；OSS 原文件暂不物理删除。",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        setDeletingId(record.id);
        try {
          await deleteKnowledgeDocument(record.id);
          setRows((current) => current.filter((item) => item.id !== record.id));
          setTotal((current) => Math.max(current - 1, 0));
          messageApi.success("知识库资源已删除");
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const clearFilters = () => {
    setKeyword("");
    setResourceType(undefined);
    setPage(1);
  };

  return (
    <div className="page-grid">
      {contextHolder}
      {modalContextHolder}
      <Card className={`surface-card ${styles.overviewPanel}`}>
        <div className={styles.overviewCard}>
          <Typography.Text type="secondary">知识库概览</Typography.Text>
          <Typography.Title level={3}>{rows.length} 个资源</Typography.Title>
          <Typography.Text type="secondary">
            {readyCount} 个可直接问 AI · {pendingCount} 个待整理 · {errorCount} 个需处理
          </Typography.Text>
          <div className={styles.overviewProgress}>
            <Progress percent={readyPercent} strokeColor="#6d5dfc" />
          </div>
          <Typography.Text type="secondary">把剧本和门店资料整理好后，AI 才能稳定回答玩家和 DM 的问题。</Typography.Text>
        </div>
      </Card>
      <Card className={`surface-card ${styles.uploadPanel}`}>
        <div className={styles.uploadGuide}>
          <span className={styles.uploadIcon}><CloudUploadOutlined /></span>
          <div>
            <Typography.Title level={4}>上传门店资料</Typography.Title>
            <Typography.Text type="secondary">
              剧本文件夹、门店规则、常见问题和活动说明都可以放在这里。上传后点进详情整理一次，后续 AI 就能用这些资料回答问题。
            </Typography.Text>
          </div>
          <Link href="/knowledge/upload">
            <Button type="primary" icon={<CloudUploadOutlined />}>上传资源</Button>
          </Link>
        </div>
      </Card>
      <Card
        className="surface-card span-12"
        title="全部知识资源"
        extra={
          <div className={styles.toolbar}>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索名称、描述、标签"
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setPage(1);
              }}
              className={styles.searchInput}
            />
            <Select
              allowClear
              placeholder="资源类型"
              value={resourceType}
              onChange={(value) => {
                setResourceType(value);
                setPage(1);
              }}
              options={[...KNOWLEDGE_RESOURCE_OPTIONS]}
              className={styles.typeSelect}
            />
            <Button className={styles.refreshButton} icon={<ClearOutlined />} onClick={clearFilters}>清空过滤项</Button>
          </div>
        }
      >
        <Table
          rowKey="id"
          tableLayout="fixed"
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (value) => `共 ${value} 条`,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
          className={styles.resourceTable}
          scroll={{ x: 1060 }}
          loading={loading}
          dataSource={rows}
          locale={{ emptyText: <Empty description="暂无知识库资源" /> }}
          columns={[
            { title: "类型", dataIndex: "resourceType", width: 120, render: (type) => <Tag color={type === "script" ? "purple" : "blue"}>{resourceLabels.get(type) ?? type}</Tag> },
            {
              title: "文档",
              dataIndex: "name",
              width: 360,
              ellipsis: true,
              render: (name, record) => (
                <span className={styles.resourceName}>
                  <FilePdfOutlined style={{ color: "#e15b64" }} />
                  <Tooltip title={<div className={styles.ellipsisTooltip}>{name}</div>}>
                    <Link href={`/knowledge/${record.id}`} className={styles.resourceNameText}>{name}</Link>
                  </Tooltip>
                  {record.scriptGenre && <Tag>{scriptGenreLabels.get(record.scriptGenre) ?? record.scriptGenre}</Tag>}
                </span>
              ),
            },
            { title: "版本", dataIndex: "activeVersion", width: 90, render: (version) => <EllipsisText value={version ?? "暂无"} /> },
            { title: "文件", dataIndex: "fileCount", width: 90 },
            { title: "大小", dataIndex: "totalSize", width: 110, render: formatBytes },
            { title: "更新时间", dataIndex: "updatedAt", width: 150, render: formatDate },
            {
              title: "AI 状态",
              dataIndex: "aiStatusText",
              width: 130,
              render: (statusText, record) => (
                <Tooltip title={`处理进度 ${record.pipelinePercent ?? 0}%`}>
                  <Tag color={aiStatusColor.get(record.aiStatus ?? "not_ready")}>{statusText ?? "未准备"}</Tag>
                </Tooltip>
              ),
            },
            {
              title: "操作",
              width: 132,
              fixed: "right",
              align: "right",
              render: (_, record) => (
                <Space size={4} className={styles.actions}>
                  <Link href={`/knowledge/${record.id}`}><Button type="text" size="small" icon={<EyeOutlined />} className={styles.actionButton}>详情</Button></Link>
                  <Button size="small" icon={<DeleteOutlined />} loading={deletingId === record.id} onClick={() => confirmDelete(record)} className={`${styles.actionButton} danger-soft-button`}>删除</Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
