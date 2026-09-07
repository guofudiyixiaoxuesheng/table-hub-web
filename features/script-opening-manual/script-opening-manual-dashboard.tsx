"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClockCircleOutlined, EyeOutlined, FileTextOutlined, ReloadOutlined, WarningOutlined } from "@ant-design/icons";
import { XMarkdown } from "@ant-design/x-markdown";
import { Button, Card, Col, Drawer, Empty, Input, Progress, Row, Select, Space, Statistic, Table, Tag, Timeline, Tooltip, Typography, message } from "antd";
import { listKnowledgeDocuments } from "@/lib/oss/knowledge-resource-api";
import { SCRIPT_GENRE_OPTIONS, type KnowledgeDocumentListItem } from "@/lib/oss/knowledge-resource-types";
import { getOpeningManual, listOpeningManuals, type OpeningManualResult } from "@/lib/script-opening-manual/script-opening-manual-api";
import styles from "./script-opening-manual-dashboard.module.css";

type ManualStatusFilter = "all" | "ready" | "generating" | "failed" | "none";

type ManualRow = {
  document: KnowledgeDocumentListItem;
  manuals: OpeningManualResult[];
};

const genreLabels = new Map<string, string>(SCRIPT_GENRE_OPTIONS.map((item) => [item.value, item.label]));

function formatDate(value?: string | null): string {
  if (!value) return "暂无";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function latestManual(manuals: OpeningManualResult[]): OpeningManualResult | null {
  return manuals[0] ?? null;
}

function scorePercent(manual: OpeningManualResult | null): number | null {
  const overall = manual?.validationResult?.overall;
  if (!overall || typeof overall !== "object" || Array.isArray(overall)) return null;
  const score = (overall as Record<string, unknown>).score;
  if (typeof score !== "number") return null;
  return Math.round(Math.max(0, Math.min(1, score)) * 100);
}

function manualStatus(row: ManualRow): { label: string; color: string } {
  const manual = latestManual(row.manuals);
  if (!manual) return { label: "未生成", color: "default" };
  if (manual.status === "ready" || manual.status === "approved") return { label: "已完成", color: "success" };
  if (manual.status === "failed") return { label: "生成失败", color: "error" };
  return { label: "生成中", color: "processing" };
}

export function ScriptOpeningManualDashboard() {
  const [rows, setRows] = useState<ManualRow[]>([]);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<ManualStatusFilter>("all");
  const [loading, setLoading] = useState(false);
  const [activeManual, setActiveManual] = useState<OpeningManualResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const documentResult = await listKnowledgeDocuments({ resourceType: "script", page: 1, pageSize: 50 });
      const nextRows = await Promise.all(
        documentResult.items.map(async (document) => {
          try {
            const manuals = await listOpeningManuals(document.id);
            return { document, manuals };
          } catch {
            return { document, manuals: [] };
          }
        }),
      );
      setRows(nextRows);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "DM 主持手册加载失败");
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  const filteredRows = useMemo(() => rows.filter((row) => {
    const manual = latestManual(row.manuals);
    const keywordMatched = !keyword.trim() || row.document.name.includes(keyword.trim());
    const statusMatched = status === "all"
      || (status === "none" && !manual)
      || (status !== "none" && manual?.status === status)
      || (status === "ready" && manual?.status === "approved");
    return keywordMatched && statusMatched;
  }), [keyword, rows, status]);

  const readyCount = rows.filter((row) => ["ready", "approved"].includes(latestManual(row.manuals)?.status ?? "")).length;
  const generatingCount = rows.filter((row) => latestManual(row.manuals)?.status === "generating").length;
  const emptyCount = rows.filter((row) => !latestManual(row.manuals)).length;

  const openManual = async (manualId: string) => {
    setDetailLoading(true);
    try {
      setActiveManual(await getOpeningManual(manualId));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "手册详情加载失败");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {contextHolder}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="surface-card">
            <Statistic title="可用于 DM 开本" value={readyCount} suffix="个剧本" prefix={<FileTextOutlined />} />
            <Typography.Text type="secondary">已有可查看的主持人手册和开本时间线</Typography.Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="surface-card">
            <Statistic title="正在生成" value={generatingCount} suffix="个剧本" prefix={<ClockCircleOutlined />} />
            <Typography.Text type="secondary">后台任务生成中，可稍后刷新</Typography.Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="surface-card">
            <Statistic title="待生成手册" value={emptyCount} suffix="个剧本" prefix={<WarningOutlined />} />
            <Typography.Text type="secondary">进入知识库详情后可一键生成</Typography.Text>
          </Card>
        </Col>
      </Row>

      <Card className="surface-card">
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <div className={styles.toolbar}>
            <Input.Search allowClear placeholder="搜索剧本名称" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
            <Select<ManualStatusFilter>
              value={status}
              onChange={setStatus}
              options={[
                { label: "全部状态", value: "all" },
                { label: "已完成", value: "ready" },
                { label: "生成中", value: "generating" },
                { label: "生成失败", value: "failed" },
                { label: "未生成", value: "none" },
              ]}
            />
            <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void loadData()}>刷新</Button>
          </div>
          <Table<ManualRow>
            rowKey={(row) => row.document.id}
            size="middle"
            loading={loading}
            dataSource={filteredRows}
            scroll={{ x: 1100 }}
            locale={{ emptyText: <Empty description="暂无 DM 主持手册" /> }}
            columns={[
              {
                title: "剧本",
                width: 260,
                fixed: "left",
                render: (_, row) => (
                  <Space direction="vertical" size={2}>
                    <Link href={`/knowledge/${row.document.id}`}>{row.document.name}</Link>
                    <Space size={4} wrap>
                      {row.document.scriptGenre ? <Tag>{genreLabels.get(row.document.scriptGenre) ?? row.document.scriptGenre}</Tag> : null}
                      <Tag>{row.document.aiStatusText ?? "AI状态未知"}</Tag>
                    </Space>
                  </Space>
                ),
              },
              {
                title: "手册状态",
                width: 120,
                render: (_, row) => {
                  const info = manualStatus(row);
                  return <Tag color={info.color}>{info.label}</Tag>;
                },
              },
              { title: "版本数", width: 90, render: (_, row) => `${row.manuals.length} 个` },
              {
                title: "最新手册",
                width: 260,
                ellipsis: true,
                render: (_, row) => {
                  const manual = latestManual(row.manuals);
                  return manual ? (
                    <Tooltip title={manual.title}><Typography.Text>{manual.title}</Typography.Text></Tooltip>
                  ) : (
                    <Typography.Text type="secondary">暂无，去知识库详情生成</Typography.Text>
                  );
                },
              },
              {
                title: "验收分",
                width: 140,
                render: (_, row) => {
                  const percent = scorePercent(latestManual(row.manuals));
                  return percent === null ? <Typography.Text type="secondary">暂无</Typography.Text> : <Progress percent={percent} size="small" />;
                },
              },
              { title: "时间线", width: 110, render: (_, row) => `${latestManual(row.manuals)?.timeline?.length ?? 0} 个节点` },
              { title: "更新时间", width: 170, render: (_, row) => formatDate(latestManual(row.manuals)?.updatedAt ?? row.document.updatedAt) },
              {
                title: "操作",
                width: 180,
                fixed: "right",
                render: (_, row) => {
                  const manual = latestManual(row.manuals);
                  return (
                    <Space size={6}>
                      <Button size="small" type="text" icon={<EyeOutlined />} disabled={!manual} loading={detailLoading} onClick={() => manual && void openManual(manual.id)}>查看</Button>
                      <Link href={`/knowledge/${row.document.id}`}><Button size="small" type="text">生成/调试</Button></Link>
                    </Space>
                  );
                },
              },
            ]}
          />
        </Space>
      </Card>

      <Drawer title={activeManual?.title ?? "DM 主持手册"} width={920} open={Boolean(activeManual)} onClose={() => setActiveManual(null)}>
        {activeManual ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Space wrap>
              <Tag color={["ready", "approved"].includes(activeManual.status) ? "success" : activeManual.status === "failed" ? "error" : "processing"}>{activeManual.status}</Tag>
              <Tag>第 {activeManual.manualVersionNo} 版</Tag>
              <Tag>{activeManual.targetDmLevel === "newbie" ? "新手DM" : "老手DM"}</Tag>
            </Space>
            <Card size="small" title="开本时间线">
              {activeManual.timeline.length ? (
                <Timeline
                  items={activeManual.timeline.map((item) => ({
                    color: "blue",
                    children: (
                      <Space direction="vertical" size={6} style={{ width: "100%" }}>
                        <Space wrap>
                          <Tag color="blue">{item.stage}</Tag>
                          {item.source ? <Typography.Text type="secondary">来源：{item.source}</Typography.Text> : null}
                        </Space>
                        <Typography.Text strong>{item.dmAction}</Typography.Text>
                        {item.playerAction ? <Typography.Text type="secondary">玩家动作：{item.playerAction}</Typography.Text> : null}
                        {item.materials.length ? <Space size={4} wrap>{item.materials.map((material) => <Tag key={material}>{material}</Tag>)}</Space> : null}
                        {item.riskNotes.length ? <Typography.Text type="warning">提醒：{item.riskNotes.join("；")}</Typography.Text> : null}
                      </Space>
                    ),
                  }))}
                />
              ) : (
                <Typography.Text type="secondary">暂无结构化时间线</Typography.Text>
              )}
            </Card>
            <Card size="small" title="Markdown 预览">
              <XMarkdown content={activeManual.markdown ?? activeManual.markdownPreview ?? "暂无内容"} openLinksInNewTab escapeRawHtml />
            </Card>
          </Space>
        ) : <Empty description="请选择手册" />}
      </Drawer>
    </Space>
  );
}
