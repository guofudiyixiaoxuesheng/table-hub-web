"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CloudUploadOutlined, DeleteOutlined, EyeOutlined, FilePdfOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Modal, Progress, Space, Table, Tag, Tooltip, Typography, Upload, message } from "antd";
import { deleteKnowledgeDocument, listKnowledgeDocuments } from "@/lib/oss/knowledge-resource-api";
import { KNOWLEDGE_RESOURCE_OPTIONS, SCRIPT_GENRE_OPTIONS, type KnowledgeDocumentListItem } from "@/lib/oss/knowledge-resource-types";
import styles from "./knowledge-dashboard.module.css";

const resourceLabels = new Map(KNOWLEDGE_RESOURCE_OPTIONS.map((item) => [item.value, item.label]));
const scriptGenreLabels = new Map(SCRIPT_GENRE_OPTIONS.map((item) => [item.value, item.label]));

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
  const [messageApi, contextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const totalFiles = useMemo(() => rows.reduce((sum, item) => sum + item.fileCount, 0), [rows]);
  const readyCount = useMemo(() => rows.filter((item) => item.activeVersionId).length, [rows]);
  const readyPercent = rows.length ? Math.round((readyCount / rows.length) * 100) : 0;

  useEffect(() => {
    listKnowledgeDocuments()
      .then(setRows)
      .catch((error) => messageApi.error(error instanceof Error ? error.message : "知识库资源加载失败"))
      .finally(() => setLoading(false));
  }, [messageApi]);

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
          messageApi.success("知识库资源已删除");
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  return (
    <div className="page-grid">
      {contextHolder}
      {modalContextHolder}
      <Card className="surface-card span-4">
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          <Typography.Text type="secondary">知识库状态</Typography.Text>
          <Typography.Title level={3} style={{ margin: 0 }}>{rows.length} 个资源 / {totalFiles} 个文件</Typography.Title>
          <Progress percent={readyPercent} strokeColor="#6d5dfc" />
          <Typography.Text type="secondary">剧本与门店资料使用同一套版本和后续 RAG 状态</Typography.Text>
        </Space>
      </Card>
      <Card className="surface-card span-8">
        <Upload.Dragger
          showUploadList={false}
          beforeUpload={() => false}
          accept=".pdf,.doc,.docx,.txt,.md,.csv,.jpg,.jpeg,.jfif,.png,.webp,.gif,.bmp,.heic,.heif"
        >
          <p><CloudUploadOutlined style={{ fontSize: 30, color: "#6d5dfc" }} /></p>
          <p style={{ marginBottom: 4 }}>拖入文档或图片，或点击选择文件</p>
          <Typography.Text type="secondary">上传后将自动检测重复与新版本</Typography.Text>
        </Upload.Dragger>
      </Card>
      <Card className="surface-card span-12" title="全部知识资源">
        <Table
          rowKey="id"
          tableLayout="fixed"
          pagination={false}
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
            { title: "状态", dataIndex: "status", width: 100, render: (status, record) => <Tag color={record.activeVersionId ? "success" : "processing"}>{record.activeVersionId ? "已上传" : status}</Tag> },
            {
              title: "操作",
              width: 132,
              fixed: "right",
              align: "right",
              render: (_, record) => (
                <Space size={4} className={styles.actions}>
                  <Link href={`/knowledge/${record.id}`}><Button type="text" size="small" icon={<EyeOutlined />} className={styles.actionButton}>详情</Button></Link>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} loading={deletingId === record.id} onClick={() => confirmDelete(record)} className={styles.actionButton}>删除</Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
