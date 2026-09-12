"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Card, Drawer, Empty, Input, Modal, Select, Space, Statistic, Table, Tag, Tooltip, Typography, message } from "antd";
import { listKnowledgeDocuments } from "@/lib/oss/knowledge-resource-api";
import { SCRIPT_GENRE_OPTIONS, type KnowledgeDocumentListItem } from "@/lib/oss/knowledge-resource-types";
import {
  approveScriptMarketingAsset,
  generateScriptMarketingAssets,
  generateScriptMarketingImages,
  listScriptMarketingAssets,
  type ScriptMarketingAssetResult,
} from "@/lib/script-marketing/script-marketing-api";
import { listArtReferenceStyleProfiles, type ArtReferenceStyleProfile } from "@/lib/script-art-reference/script-art-reference-api";
import { ScriptMarketingResult } from "./script-marketing-result";
import { ScriptVisualPanel } from "./script-visual-panel";

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

export function ScriptMarketingDetail({ documentId }: { documentId: string }) {
  const [document, setDocument] = useState<KnowledgeDocumentListItem | null>(null);
  const [assets, setAssets] = useState<ScriptMarketingAssetResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [activeAsset, setActiveAsset] = useState<ScriptMarketingAssetResult | null>(null);
  const [usageType, setUsageType] = useState(MATERIAL_USAGE_OPTIONS[0].value);
  const [extraRequirement, setExtraRequirement] = useState("");
  const [generating, setGenerating] = useState(false);
  const [adoptingAssetId, setAdoptingAssetId] = useState<string | null>(null);
  const [generatingImageAssetId, setGeneratingImageAssetId] = useState<string | null>(null);
  const [styleProfiles, setStyleProfiles] = useState<ArtReferenceStyleProfile[]>([]);
  const [styleProfileId, setStyleProfileId] = useState<string | undefined>();
  const [messageApi, contextHolder] = message.useMessage();

  const usageOption = useMemo(
    () => MATERIAL_USAGE_OPTIONS.find((item) => item.value === usageType) ?? MATERIAL_USAGE_OPTIONS[0],
    [usageType],
  );
  const approvedCount = assets.filter((asset) => asset.status === "approved").length;
  const latestAsset = assets[0];
  const sortedAssets = useMemo(
    () => [...assets].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()),
    [assets],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [documentResult, assetRows, profiles] = await Promise.all([
        listKnowledgeDocuments({ resourceType: "script", page: 1, pageSize: 100 }),
        listScriptMarketingAssets(documentId),
        listArtReferenceStyleProfiles(),
      ]);
      setDocument(documentResult.items.find((item) => item.id === documentId) ?? null);
      setAssets(assetRows);
      setStyleProfiles(profiles.filter((profile) => profile.status === "ready"));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "运营物料详情加载失败");
    } finally {
      setLoading(false);
    }
  }, [documentId, messageApi]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  const generateMaterial = async () => {
    setGenerating(true);
    try {
      await generateScriptMarketingAssets(documentId, {
        purpose: "session_fill",
        tone: "门店私域宣传、玩家友好、不过度剧透",
        avoidSpoilers: true,
        usageType,
        usageLabel: usageOption.label,
        styleProfileId: styleProfileId ?? null,
        extraRequirement: extraRequirement.trim() || null,
      });
      setGenerateOpen(false);
      messageApi.success("AI 运营物料已在后台生成，请稍后手动点击“刷新”查看新版本");
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
      setAssets((current) => current.map((item) => (item.assetId === result.assetId ? result : item)));
      setActiveAsset((current) => (current?.assetId === result.assetId ? result : current));
      messageApi.success("已确认正式使用");
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
      const result = await generateScriptMarketingImages(asset?.assetId, {
        includeCover: true,
        includeDetail: false,
        styleProfileId: styleProfileId ?? asset.styleProfileId ?? null,
      });
      setAssets((current) => current.map((item) => (item?.assetId === result?.assetId ? result : item)));
      setActiveAsset((current) => (current?.assetId === result?.assetId ? result : current));
      messageApi.success("图片生成任务已在后台启动，请稍后手动点击“刷新”查看结果");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "图片生成失败");
    } finally {
      setGeneratingImageAssetId(null);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {contextHolder}
      <Space wrap>
        <Link href="/knowledge/marketing">
          <Button icon={<ArrowLeftOutlined />}>返回运营物料</Button>
        </Link>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void loadData()}>
          刷新
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setGenerateOpen(true)}>
          生成新物料
        </Button>
        {approvedCount ? (
          <Link href={`/sessions?documentId=${documentId}`}>
            <Button>用正式物料创建场次</Button>
          </Link>
        ) : null}
      </Space>

      <Card className="surface-card" loading={loading}>
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          <Space wrap align="center">
            <Typography.Title level={4} style={{ margin: 0 }}>
              {document?.name ?? "运营物料详情"}
            </Typography.Title>
            {document?.scriptGenre ? <Tag>{genreLabels.get(document.scriptGenre) ?? document.scriptGenre}</Tag> : null}
            <Tag color={approvedCount ? "success" : latestAsset ? "warning" : "default"}>
              {approvedCount ? "已有正式物料" : latestAsset ? "待店长确认" : "未生成"}
            </Tag>
          </Space>
          <Typography.Text type="secondary">
            这里集中管理一个剧本的拼车卡片、详情页、朋友圈文案和图片方案。确认正式版本后，创建场次可以直接复用。
          </Typography.Text>
          <Space wrap size={24}>
            <Statistic title="全部版本" value={assets.length} suffix="个" />
            <Statistic title="正式版本" value={approvedCount} suffix="个" />
            <Statistic title="最新用途" value={latestAsset?.usageLabel ?? "暂无"} />
            <Statistic title="图片状态" value={latestAsset?.imageStatus === "ready" ? "已就绪" : "待生成"} />
          </Space>
        </Space>
      </Card>

      <Card className="surface-card" title="物料版本列表">
        <Table<ScriptMarketingAssetResult>
          rowKey={(asset) => asset.assetId ?? `${asset.versionId}-${asset.versionNo}`}
          loading={loading}
          dataSource={sortedAssets}
          scroll={{ x: "max-content" }}
          locale={{
            emptyText: (
              <Empty description="暂无运营物料">
                <Button type="primary" onClick={() => setGenerateOpen(true)}>
                  生成第一版物料
                </Button>
              </Empty>
            ),
          }}
          columns={[
            {
              title: "版本",
              render: (_, asset) => `V${asset.versionNo ?? "-"}`,
            },
            {
              title: "状态",
              render: (_, asset) => (
                <Tag color={asset.status === "approved" ? "success" : "processing"}>
                  {asset.status === "approved" ? "正式版本" : "草稿"}
                </Tag>
              ),
            },
            {
              title: "物料用途",
              render: (_, asset) => <Tag color="blue">{asset.usageLabel || "拼车招募版"}</Tag>,
            },
            {
              title: "标题",
              ellipsis: true,
              render: (_, asset) => (
                <Tooltip title={asset.title}>
                  <Typography.Text>{asset.title}</Typography.Text>
                </Tooltip>
              ),
            },
            {
              title: "关键词",
              render: (_, asset) => (
                <Space size={4} wrap>
                  {(asset.tags ?? []).slice(0, 4).map((tag) => <Tag key={tag}>{tag}</Tag>)}
                </Space>
              ),
            },
            {
              title: "图片",
              render: (_, asset) => (
                <Tag color={asset.imageStatus === "ready" ? "success" : asset.imageStatus === "failed" ? "error" : "default"}>
                  {asset.imageStatus === "ready" ? "已生成" : asset.imageStatus === "failed" ? "失败" : "待生成"}
                </Tag>
              ),
            },
            {
              title: "创建时间",
              sorter: (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
              defaultSortOrder: "descend",
              render: (_, asset) => formatDate(asset.createdAt),
            },
            {
              title: "操作",
              render: (_, asset) => (
                <Space size={6} wrap>
                  <Button size="small" type="text" onClick={() => setActiveAsset(asset)}>
                    详情
                  </Button>
                  {asset.status !== "approved" ? (
                    <Button size="small" type="text" loading={adoptingAssetId === asset.assetId} onClick={() => void adoptMaterial(asset)}>
                      确认使用
                    </Button>
                  ) : (
                    <Button size="small" type="text" loading={generatingImageAssetId === asset.assetId} onClick={() => void generateImages(asset)}>
                      生成图片
                    </Button>
                  )}
                  {asset.status === "approved" ? (
                    <Link href={`/sessions?documentId=${documentId}`}>
                      <Button size="small" type="text">创建场次</Button>
                    </Link>
                  ) : null}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <ScriptVisualPanel documentId={documentId} />

      <Modal
        title={document ? `生成《${document.name}》运营物料` : "生成运营物料"}
        open={generateOpen}
        onCancel={() => setGenerateOpen(false)}
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
            <Typography.Text strong>图片素材规律（可选）</Typography.Text>
            <Select
              allowClear
              style={{ width: "100%", marginTop: 8 }}
              value={styleProfileId}
              onChange={setStyleProfileId}
              placeholder="不选择则使用通用商业海报风"
              options={styleProfiles.map((profile) => ({
                value: profile.id,
                label: `${profile.name} · ${profile.sampleCount} 套样本`,
              }))}
            />
            <Typography.Text type="secondary">
              选择后，该档案会在你确认物料并生成图片时，作为构图、色彩与视觉隐喻约束。
            </Typography.Text>
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
        </Space>
      </Modal>

      <Drawer
        title={activeAsset ? `${activeAsset.title} · 物料详情` : "物料详情"}
        width="70vw"
        open={Boolean(activeAsset)}
        onClose={() => setActiveAsset(null)}
      >
        {activeAsset ? (
          <ScriptMarketingResult
            result={activeAsset}
            onAdopt={activeAsset.status === "approved" ? undefined : () => void adoptMaterial(activeAsset)}
            onGenerateImages={activeAsset.status === "approved" ? () => void generateImages(activeAsset) : undefined}
            adopting={adoptingAssetId === activeAsset.assetId}
            generatingImages={generatingImageAssetId === activeAsset.assetId}
          />
        ) : null}
      </Drawer>
    </Space>
  );
}
