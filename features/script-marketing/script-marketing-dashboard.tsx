"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BulbOutlined, EyeOutlined, FileTextOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Card, Col, Drawer, Empty, Input, Row, Select, Space, Statistic, Table, Tag, Tooltip, Typography, message } from "antd";
import { listKnowledgeDocuments } from "@/lib/oss/knowledge-resource-api";
import { SCRIPT_GENRE_OPTIONS, type KnowledgeDocumentListItem } from "@/lib/oss/knowledge-resource-types";
import { listScriptMarketingAssets, type ScriptMarketingAssetResult } from "@/lib/script-marketing/script-marketing-api";
import { ScriptMarketingResult } from "./script-marketing-result";
import styles from "./script-marketing-dashboard.module.css";

type AssetStatusFilter = "all" | "approved" | "draft" | "none";

type MarketingRow = {
  document: KnowledgeDocumentListItem;
  assets: ScriptMarketingAssetResult[];
};

const genreLabels = new Map<string, string>(SCRIPT_GENRE_OPTIONS.map((item) => [item.value, item.label]));

function formatDate(value?: string | null): string {
  if (!value) return "暂无";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function latestAsset(assets: ScriptMarketingAssetResult[]): ScriptMarketingAssetResult | null {
  return assets[0] ?? null;
}

function approvedAssets(assets: ScriptMarketingAssetResult[]): ScriptMarketingAssetResult[] {
  return assets.filter((asset) => asset.status === "approved");
}

function statusText(row: MarketingRow): { label: string; color: string } {
  if (approvedAssets(row.assets).length) return { label: "有正式物料", color: "success" };
  if (row.assets.length) return { label: "待店长确认", color: "warning" };
  return { label: "未生成", color: "default" };
}

export function ScriptMarketingDashboard() {
  const [rows, setRows] = useState<MarketingRow[]>([]);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<AssetStatusFilter>("all");
  const [loading, setLoading] = useState(false);
  const [activeRow, setActiveRow] = useState<MarketingRow | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const documentResult = await listKnowledgeDocuments({ resourceType: "script", page: 1, pageSize: 50 });
      const marketingRows = await Promise.all(
        documentResult.items.map(async (document) => {
          try {
            const assets = await listScriptMarketingAssets(document.id);
            return { document, assets };
          } catch {
            return { document, assets: [] };
          }
        }),
      );
      setRows(marketingRows);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "AI 运营物料加载失败");
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const keywordMatched = !keyword.trim() || row.document.name.includes(keyword.trim());
      const approvedCount = approvedAssets(row.assets).length;
      const statusMatched = status === "all"
        || (status === "approved" && approvedCount > 0)
        || (status === "draft" && row.assets.length > 0 && approvedCount === 0)
        || (status === "none" && row.assets.length === 0);
      return keywordMatched && statusMatched;
    });
  }, [keyword, rows, status]);

  const totalApproved = rows.filter((row) => approvedAssets(row.assets).length).length;
  const totalDraft = rows.filter((row) => row.assets.length && !approvedAssets(row.assets).length).length;
  const totalEmpty = rows.filter((row) => !row.assets.length).length;

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {contextHolder}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="surface-card">
            <Statistic title="可直接用于开场次" value={totalApproved} suffix="个剧本" prefix={<BulbOutlined />} />
            <Typography.Text type="secondary">已有店长确认的正式物料版本</Typography.Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="surface-card">
            <Statistic title="待确认草稿" value={totalDraft} suffix="个剧本" prefix={<FileTextOutlined />} />
            <Typography.Text type="secondary">需要店长检查文案、图片和场次信息</Typography.Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="surface-card">
            <Statistic title="待生成物料" value={totalEmpty} suffix="个剧本" prefix={<PlusOutlined />} />
            <Typography.Text type="secondary">进入知识库详情后可一键生成</Typography.Text>
          </Card>
        </Col>
      </Row>

      <Card className="surface-card">
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <div className={styles.toolbar}>
            <Input.Search
              allowClear
              placeholder="搜索剧本名称"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <Select<AssetStatusFilter>
              value={status}
              onChange={setStatus}
              options={[
                { label: "全部状态", value: "all" },
                { label: "有正式物料", value: "approved" },
                { label: "待确认草稿", value: "draft" },
                { label: "未生成", value: "none" },
              ]}
            />
            <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void loadData()}>刷新</Button>
          </div>
          <Table<MarketingRow>
            rowKey={(row) => row.document.id}
            size="middle"
            loading={loading}
            dataSource={filteredRows}
            scroll={{ x: 1060 }}
            locale={{ emptyText: <Empty description="暂无剧本运营物料" /> }}
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
                title: "物料状态",
                width: 130,
                render: (_, row) => {
                  const info = statusText(row);
                  return <Tag color={info.color}>{info.label}</Tag>;
                },
              },
              {
                title: "正式版本",
                width: 100,
                render: (_, row) => `${approvedAssets(row.assets).length} 个`,
              },
              {
                title: "最新标题",
                width: 260,
                ellipsis: true,
                render: (_, row) => {
                  const asset = latestAsset(row.assets);
                  return asset ? (
                    <Tooltip title={asset.title}>
                      <Typography.Text>{asset.title}</Typography.Text>
                    </Tooltip>
                  ) : (
                    <Typography.Text type="secondary">暂无，去知识库详情生成</Typography.Text>
                  );
                },
              },
              {
                title: "关键词",
                width: 220,
                render: (_, row) => {
                  const asset = latestAsset(row.assets);
                  return asset?.tags?.length ? (
                    <Space size={4} wrap>
                      {asset.tags.slice(0, 4).map((tag) => <Tag key={tag}>{tag}</Tag>)}
                    </Space>
                  ) : "暂无";
                },
              },
              {
                title: "图片",
                width: 120,
                render: (_, row) => {
                  const asset = latestAsset(row.assets);
                  return asset ? <Tag color={asset.imageStatus === "ready" ? "success" : "default"}>{asset.imageStatus === "ready" ? "已生成" : "未就绪"}</Tag> : "暂无";
                },
              },
              {
                title: "更新时间",
                width: 170,
                render: (_, row) => formatDate(latestAsset(row.assets)?.createdAt ?? row.document.updatedAt),
              },
              {
                title: "操作",
                width: 210,
                fixed: "right",
                render: (_, row) => (
                  <Space size={6}>
                    <Button size="small" type="text" icon={<EyeOutlined />} disabled={!row.assets.length} onClick={() => setActiveRow(row)}>查看</Button>
                    <Link href={`/knowledge/${row.document.id}`}>
                      <Button size="small" type="text">生成/审批</Button>
                    </Link>
                    {approvedAssets(row.assets).length ? (
                      <Link href={`/sessions?documentId=${row.document.id}`}>
                        <Button size="small" type="text">创建场次</Button>
                      </Link>
                    ) : null}
                  </Space>
                ),
              },
            ]}
          />
        </Space>
      </Card>

      <Drawer
        title={activeRow ? `${activeRow.document.name} · 运营物料` : "运营物料"}
        width={860}
        open={Boolean(activeRow)}
        onClose={() => setActiveRow(null)}
      >
        {activeRow?.assets.length ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            {activeRow.assets.map((asset, index) => (
              <ScriptMarketingResult key={asset.assetId ?? `${asset.versionId}-${index}`} result={asset} />
            ))}
          </Space>
        ) : (
          <Empty description="暂无运营物料" />
        )}
      </Drawer>
    </Space>
  );
}
