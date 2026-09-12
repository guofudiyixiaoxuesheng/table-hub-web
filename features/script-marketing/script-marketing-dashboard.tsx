"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BulbOutlined, EyeOutlined, FileTextOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Card, Col, Drawer, Empty, Input, Modal, Row, Select, Space, Statistic, Table, Tag, Tooltip, Typography, message } from "antd";
import { listKnowledgeDocuments } from "@/lib/oss/knowledge-resource-api";
import { SCRIPT_GENRE_OPTIONS, type KnowledgeDocumentListItem } from "@/lib/oss/knowledge-resource-types";
import {
  approveScriptMarketingAsset,
  generateScriptMarketingAssets,
  generateScriptMarketingImages,
  listScriptMarketingAssets,
  type ScriptMarketingAssetResult,
} from "@/lib/script-marketing/script-marketing-api";
import { ScriptMarketingResult } from "./script-marketing-result";
import styles from "./script-marketing-dashboard.module.css";

type AssetStatusFilter = "all" | "approved" | "draft" | "none";

type MarketingRow = {
  document: KnowledgeDocumentListItem;
  assets: ScriptMarketingAssetResult[];
};

const MATERIAL_USAGE_OPTIONS = [
  {
    label: "拼车招募版",
    value: "session_recruiting",
    description: "优先服务创建场次、玩家端拼车卡片和详情页。",
  },
  {
    label: "朋友圈种草版",
    value: "moments_seeding",
    description: "优先生成适合微信私域发布的朋友圈文案和海报提示词。",
  },
  {
    label: "新手友好版",
    value: "newbie_friendly",
    description: "突出低门槛、好上车、适合第一次玩剧本杀。",
  },
  {
    label: "老玩家进阶版",
    value: "experienced_players",
    description: "突出机制、反转、演绎空间和进阶体验。",
  },
  {
    label: "节假日活动版",
    value: "holiday_campaign",
    description: "适合节日、团建、周末活动包装。",
  },
];

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
  const router = useRouter();
  const [rows, setRows] = useState<MarketingRow[]>([]);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<AssetStatusFilter>("all");
  const [loading, setLoading] = useState(false);
  const [activeRow, setActiveRow] = useState<MarketingRow | null>(null);
  const [generatingRow, setGeneratingRow] = useState<MarketingRow | null>(null);
  const [usageType, setUsageType] = useState(MATERIAL_USAGE_OPTIONS[0].value);
  const [extraRequirement, setExtraRequirement] = useState("");
  const [generating, setGenerating] = useState(false);
  const [adoptingAssetId, setAdoptingAssetId] = useState<string | null>(null);
  const [generatingImageAssetId, setGeneratingImageAssetId] = useState<string | null>(null);
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
  const usageOption = MATERIAL_USAGE_OPTIONS.find((item) => item.value === usageType) ?? MATERIAL_USAGE_OPTIONS[0];

  const replaceRowAssets = (documentId: string, updater: (assets: ScriptMarketingAssetResult[]) => ScriptMarketingAssetResult[]) => {
    setRows((current) => current.map((row) => (
      row.document.id === documentId ? { ...row, assets: updater(row.assets) } : row
    )));
    setActiveRow((current) => (
      current?.document.id === documentId ? { ...current, assets: updater(current.assets) } : current
    ));
  };

  const openGenerateModal = (row: MarketingRow) => {
    setGeneratingRow(row);
    setUsageType(MATERIAL_USAGE_OPTIONS[0].value);
    setExtraRequirement("");
  };

  const generateMaterial = async () => {
    if (!generatingRow) return;
    setGenerating(true);
    try {
      await generateScriptMarketingAssets(generatingRow.document.id, {
        purpose: "session_fill",
        tone: "门店私域宣传、玩家友好、不过度剧透",
        avoidSpoilers: true,
        usageType,
        usageLabel: usageOption.label,
        extraRequirement: extraRequirement.trim() || null,
      });
      setGeneratingRow(null);
      messageApi.success("AI 运营物料已在后台生成，请稍后手动刷新查看新版本");
      router.push(`/knowledge/marketing/${generatingRow.document.id}`);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "AI 运营物料生成失败");
    } finally {
      setGenerating(false);
    }
  };

  const adoptMaterial = async (asset: ScriptMarketingAssetResult) => {
    if (!asset.assetId) return;
    setAdoptingAssetId(asset.assetId);
    try {
      const result = await approveScriptMarketingAsset(asset.assetId);
      replaceRowAssets(result.documentId, (assets) => assets.map((item) => (
        item.assetId === result.assetId ? result : item
      )));
      messageApi.success("已确认正式使用，创建场次时可以选择这版物料");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "确认使用失败");
    } finally {
      setAdoptingAssetId(null);
    }
  };

  const generateImages = async (asset: ScriptMarketingAssetResult) => {
    if (!asset.assetId) return;
    setGeneratingImageAssetId(asset.assetId);
    try {
      const result = await generateScriptMarketingImages(asset.assetId, {
        includeCover: true,
        includeDetail: false,
      });
      replaceRowAssets(result.documentId, (assets) => assets.map((item) => (
        item.assetId === result.assetId ? result : item
      )));
      messageApi.success("图片已生成并保存，可用于拼车卡片和详情页");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "图片生成失败");
    } finally {
      setGeneratingImageAssetId(null);
    }
  };

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
            <Typography.Text type="secondary">可在本页直接生成拼车、详情和朋友圈物料</Typography.Text>
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
                    <Link href={`/knowledge/marketing/${row.document.id}`}>{row.document.name}</Link>
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
                title: "物料用途",
                width: 140,
                render: (_, row) => {
                  const asset = latestAsset(row.assets);
                  return asset ? <Tag color="blue">{asset.usageLabel || "拼车招募版"}</Tag> : "暂无";
                },
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
                width: 250,
                fixed: "right",
                render: (_, row) => (
                  <Space size={6}>
                    <Link href={`/knowledge/marketing/${row.document.id}`}>
                      <Button size="small" type="text" icon={<EyeOutlined />}>详情</Button>
                    </Link>
                    <Button size="small" type="text" onClick={() => openGenerateModal(row)}>生成物料</Button>
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
              <ScriptMarketingResult
                key={asset.assetId ?? `${asset.versionId}-${index}`}
                result={asset}
                onAdopt={asset.status === "approved" ? undefined : () => void adoptMaterial(asset)}
                onGenerateImages={asset.status === "approved" ? () => void generateImages(asset) : undefined}
                adopting={adoptingAssetId === asset.assetId}
                generatingImages={generatingImageAssetId === asset.assetId}
              />
            ))}
          </Space>
        ) : (
          <Empty description="暂无运营物料" />
        )}
      </Drawer>

      <Modal
        title={generatingRow ? `生成《${generatingRow.document.name}》运营物料` : "生成运营物料"}
        open={Boolean(generatingRow)}
        onCancel={() => setGeneratingRow(null)}
        onOk={() => void generateMaterial()}
        confirmLoading={generating}
        okText="开始生成"
        cancelText="取消"
        destroyOnHidden
      >
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <div>
            <Typography.Text strong>物料用途</Typography.Text>
            <Select
              style={{ width: "100%", marginTop: 8 }}
              value={usageType}
              onChange={setUsageType}
              options={MATERIAL_USAGE_OPTIONS.map((item) => ({ label: item.label, value: item.value }))}
            />
            <Typography.Text type="secondary">{usageOption.description}</Typography.Text>
          </div>
          <div>
            <Typography.Text strong>店长补充意见</Typography.Text>
            <Input.TextArea
              style={{ marginTop: 8 }}
              value={extraRequirement}
              onChange={(event) => setExtraRequirement(event.target.value)}
              rows={4}
              maxLength={500}
              showCount
              placeholder="例如：突出适合新手、周末下午场、不要太吓人、朋友圈文案更口语化"
            />
          </div>
          <Typography.Text type="secondary">
            生成后会得到：创建场次填充建议、玩家端卡片文案、详情页文案、朋友圈文案和图片生成提示词。
          </Typography.Text>
        </Space>
      </Modal>
    </Space>
  );
}
