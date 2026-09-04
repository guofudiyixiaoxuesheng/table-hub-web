"use client";

import { AuditOutlined, ExperimentOutlined, ReloadOutlined, SafetyCertificateOutlined, SearchOutlined } from "@ant-design/icons";
import { XMarkdown } from "@ant-design/x-markdown";
import { Button, Card, Descriptions, Drawer, Empty, Input, Progress, Select, Space, Statistic, Table, Tag, Tooltip, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import {
  getRagEvaluation,
  getRagEvaluationSummary,
  listRagEvaluations,
  runRagEvaluation,
  type RagEvaluationJob,
  type RagEvaluationStatus,
  type RagEvaluationSummary,
} from "@/lib/analytics/rag-evaluation-api";
import styles from "./knowledge-evaluation-dashboard.module.css";

const statusOptions: Array<{ label: string; value: RagEvaluationStatus }> = [
  { label: "待评估", value: "pending" },
  { label: "评估中", value: "running" },
  { label: "已完成", value: "completed" },
  { label: "失败", value: "failed" },
  { label: "已跳过", value: "skipped" },
];

const statusMap: Record<RagEvaluationStatus, { text: string; color: string }> = {
  pending: { text: "待评估", color: "gold" },
  running: { text: "评估中", color: "processing" },
  completed: { text: "已完成", color: "success" },
  failed: { text: "失败", color: "error" },
  skipped: { text: "已跳过", color: "default" },
};

const metricMap: Record<string, { title: string; description: string }> = {
  faithfulness: {
    title: "依据一致性",
    description: "回答是否忠于召回资料，越高代表越少胡编。",
  },
  answer_relevancy: {
    title: "问题相关性",
    description: "回答是否正面回应用户问题，越高代表越不跑题。",
  },
  context_utilization: {
    title: "资料利用率",
    description: "回答是否充分使用检索到的资料，越高代表召回内容被有效利用。",
  },
  spoiler_safety: {
    title: "剧透安全性",
    description: "回答是否符合当前用户权限，越高代表越不容易误泄露真相/凶手/其他角色隐私。",
  },
  dm_usefulness: {
    title: "DM 实用性",
    description: "回答对 DM 开本、控场、话术和门店执行是否有帮助。",
  },
};

function formatTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatScore(value?: number | null) {
  if (value === undefined || value === null) return "待评估";
  return `${Math.round(value * 100)}分`;
}

function metricPercent(value: unknown) {
  return typeof value === "number" ? Math.round(value * 100) : 0;
}

export function KnowledgeEvaluationDashboard() {
  const [summary, setSummary] = useState<RagEvaluationSummary | null>(null);
  const [rows, setRows] = useState<RagEvaluationJob[]>([]);
  const [detail, setDetail] = useState<RagEvaluationJob | null>(null);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<RagEvaluationStatus | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextSummary, list] = await Promise.all([
        getRagEvaluationSummary(),
        listRagEvaluations({ status, keyword, page, pageSize }),
      ]);
      setSummary(nextSummary);
      setRows(list.items);
      setTotal(list.meta.total);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "评估数据加载失败");
    } finally {
      setLoading(false);
    }
  }, [keyword, messageApi, page, pageSize, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 300);
    return () => window.clearTimeout(timer);
  }, [load]);

  const runJob = async (id: string) => {
    setRunningId(id);
    try {
      const result = await runRagEvaluation(id);
      setDetail(result);
      messageApi.success("评估完成");
      await load();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "运行评估失败");
    } finally {
      setRunningId(null);
    }
  };

  const openDetail = async (id: string) => {
    try {
      setDetail(await getRagEvaluation(id));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "详情加载失败");
    }
  };

  return (
    <div className="page-grid">
      {contextHolder}
      <Card className="surface-card span-4">
        <Statistic title="AI 回答质量" value={formatScore(summary?.averageScore)} prefix={<SafetyCertificateOutlined />} />
      </Card>
      <Card className="surface-card span-4">
        <Statistic title="待评估样本" value={summary?.pending ?? 0} prefix={<ExperimentOutlined />} />
      </Card>
      <Card className="surface-card span-4">
        <Statistic title="需人工复核" value={summary?.needsReview ?? 0} prefix={<AuditOutlined />} />
      </Card>

      <Card className="surface-card span-12">
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <Space wrap>
            <Tag color="blue">Langfuse Trace 已接入</Tag>
            <Tag color="green">评估任务已入库</Tag>
            <Tag color="purple">当前评分：LLM Judge</Tag>
            <Tag>RAGAS 待接入</Tag>
          </Space>
          <Typography.Title level={3} style={{ margin: 0 }}>AI 回答质量检测</Typography.Title>
          <Typography.Text type="secondary">
            系统会从剧本相关 RAG 对话中沉淀评估样本，记录当时的问题、回答和召回上下文。点击“运行”会调用 LLM Judge 输出质量分数；如果模型不可用，会降级为本地启发式评分，保证流程不断。
          </Typography.Text>
          <Progress percent={summary?.averageScore ? Math.round(summary.averageScore * 100) : 0} style={{ maxWidth: 360 }} />
        </Space>
      </Card>

      <Card
        className="surface-card span-12"
        title="评估样本"
        extra={(
          <Space wrap>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索问题/回答"
              value={keyword}
              onChange={(event) => { setKeyword(event.target.value); setPage(1); }}
              style={{ width: 220 }}
            />
            <Select
              allowClear
              placeholder="评估状态"
              options={statusOptions}
              value={status}
              onChange={(value) => { setStatus(value); setPage(1); }}
              style={{ width: 140 }}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void load()}>刷新</Button>
          </Space>
        )}
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          scroll={{ x: 1080 }}
          locale={{ emptyText: <Empty description="暂无评估样本。完成一次剧本 RAG 问答后，这里会自动出现待评估任务。" /> }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
          columns={[
            {
              title: "问题",
              dataIndex: "question",
              width: 280,
              ellipsis: true,
              render: (value) => <Tooltip title={value}>{value}</Tooltip>,
            },
            { title: "关联剧本", dataIndex: "documentName", width: 180, ellipsis: true, render: (value) => value || "未识别" },
            {
              title: "状态",
              dataIndex: "status",
              width: 110,
              render: (value: RagEvaluationStatus) => <Tag color={statusMap[value].color}>{statusMap[value].text}</Tag>,
            },
            { title: "评分", dataIndex: "overallScore", width: 110, render: formatScore },
            { title: "复核", dataIndex: "needsReview", width: 100, render: (value) => value ? <Tag color="red">需要</Tag> : <Tag color="green">无需</Tag> },
            { title: "上下文", dataIndex: "contexts", width: 100, render: (value: unknown[]) => `${value?.length ?? 0} 段` },
            { title: "创建时间", dataIndex: "createdAt", width: 150, render: formatTime },
            {
              title: "操作",
              width: 150,
              fixed: "right",
              render: (_, record) => (
                <Space size={4}>
                  <Button type="text" size="small" onClick={() => void openDetail(record.id)}>详情</Button>
                  <Button type="text" size="small" loading={runningId === record.id} onClick={() => void runJob(record.id)}>运行</Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Drawer title="评估详情" width={900} open={Boolean(detail)} onClose={() => setDetail(null)}>
        {detail ? (
          <Space direction="vertical" size={16} className={styles.detail}>
            <Card title="评估概览" className={styles.compactCard}>
              <Descriptions bordered size="small" column={2} items={[
                { key: "status", label: "状态", children: <Tag color={statusMap[detail.status].color}>{statusMap[detail.status].text}</Tag> },
                { key: "score", label: "整体评分", children: formatScore(detail.overallScore) },
                { key: "script", label: "关联剧本", children: detail.documentName || "未识别" },
                { key: "time", label: "创建时间", children: formatTime(detail.createdAt) },
                { key: "reason", label: "评估说明", span: 2, children: detail.judgeReason || detail.errorMessage || "暂无" },
              ]} />
            </Card>
            <Card title="指标" className={styles.compactCard}>
              <div className={styles.metricGrid}>
                {Object.entries(metricMap).map(([key, metric]) => (
                  <div key={key} className={styles.metricItem}>
                    <Space align="baseline" size={8}>
                      <Typography.Text strong>{metric.title}</Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{key}</Typography.Text>
                    </Space>
                    <Typography.Paragraph type="secondary" style={{ margin: "4px 0 6px", fontSize: 12 }}>
                      {metric.description}
                    </Typography.Paragraph>
                    <Progress percent={metricPercent(detail.metrics[key])} size="small" />
                  </div>
                ))}
              </div>
            </Card>
            <Card title="用户问题" className={styles.compactCard}><Typography.Paragraph>{detail.question}</Typography.Paragraph></Card>
            {detail.rewrittenQuery ? <Card title="改写问题" className={styles.compactCard}><Typography.Paragraph>{detail.rewrittenQuery}</Typography.Paragraph></Card> : null}
            <Card title="AI 回答" className={styles.compactCard}>
              <XMarkdown
                content={detail.answer}
                className={styles.markdown}
                openLinksInNewTab
                escapeRawHtml
              />
            </Card>
            <Card title={`召回上下文（${detail.contexts.length}）`} className={styles.compactCard}>
              <Space direction="vertical" style={{ width: "100%" }}>
                {detail.contexts.slice(0, 5).map((item, index) => (
                  <Card key={String(item.chunk_id ?? item.chunkId ?? index)} size="small" className={styles.contextCard}>
                    <Typography.Text type="secondary">{String(item.relative_path ?? item.relativePath ?? item.title ?? "未知来源")}</Typography.Text>
                    <Typography.Paragraph ellipsis={{ rows: 4, expandable: true }}>{String(item.content ?? "")}</Typography.Paragraph>
                  </Card>
                ))}
              </Space>
            </Card>
          </Space>
        ) : null}
      </Drawer>
    </div>
  );
}
