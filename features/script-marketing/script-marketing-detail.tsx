"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Card, Drawer, Empty, Image, Input, Modal, Select, Space, Statistic, Table, Tag, Tooltip, Typography, message } from "antd";
import { listKnowledgeDocuments } from "@/lib/oss/knowledge-resource-api";
import { SCRIPT_GENRE_OPTIONS, type KnowledgeDocumentListItem } from "@/lib/oss/knowledge-resource-types";
import {
  approveScriptMarketingAsset,
  generateScriptMarketingAssets,
  generateScriptMarketingImages,
  listScriptMarketingAssets,
  listScriptMarketingImages,
  type ScriptMarketingImageResult,
  type ScriptMarketingAssetResult,
} from "@/lib/script-marketing/script-marketing-api";
import { listArtReferenceStyleProfiles, type ArtReferenceStyleProfile } from "@/lib/script-art-reference/script-art-reference-api";
import { ScriptMarketingResult } from "./script-marketing-result";

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

const IMAGE_DIRECTION_OPTIONS = [
  { value: "young_editorial", label: "年轻杂志感" },
  { value: "cinematic_collage", label: "电影感拼贴" },
  { value: "dramatic_light", label: "戏剧光影" },
  { value: "party_tension", label: "强化事件临界感" },
  { value: "character_emotion", label: "强化人物情绪" },
  { value: "symbolic_prop", label: "强化标题隐喻" },
  { value: "print_texture", label: "发行印刷粗粝感" },
  { value: "clean_layout", label: "留白便于后期排版" },
];

function formatDate(value?: string | null): string {
  if (!value) return "暂无";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

export function ScriptMarketingDetail({ documentId }: { documentId: string }) {
  const [document, setDocument] = useState<KnowledgeDocumentListItem | null>(null);
  const [assets, setAssets] = useState<ScriptMarketingAssetResult[]>([]);
  const [images, setImages] = useState<ScriptMarketingImageResult[]>([]);
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
  const [imageAsset, setImageAsset] = useState<ScriptMarketingAssetResult | null>(null);
  const [imageFeedback, setImageFeedback] = useState("");
  const [imageDirections, setImageDirections] = useState<string[]>([]);
  const [imageStyleProfileId, setImageStyleProfileId] = useState<string | undefined>();
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
      const [documentResult, assetRows, imageRows, profiles] = await Promise.all([
        listKnowledgeDocuments({ resourceType: "script", page: 1, pageSize: 100 }),
        listScriptMarketingAssets(documentId),
        listScriptMarketingImages(documentId),
        listArtReferenceStyleProfiles(),
      ]);
      setDocument(documentResult.items.find((item) => item.id === documentId) ?? null);
      setAssets(assetRows);
      setImages(imageRows);
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

  const openImageGeneration = (asset: ScriptMarketingAssetResult) => {
    setImageAsset(asset);
    setImageFeedback("");
    setImageDirections([]);
    setImageStyleProfileId(asset.styleProfileId ?? styleProfileId);
  };

  const generateImages = async () => {
    const asset = imageAsset;
    if (!asset?.assetId) return;
    setGeneratingImageAssetId(asset.assetId);
    try {
      const selectedDirections = IMAGE_DIRECTION_OPTIONS
        .filter((item) => imageDirections.includes(item.value))
        .map((item) => item.label);
      const promptOverride = [
        selectedDirections.length ? `本次画面方向：${selectedDirections.join("、")}。` : "",
        imageFeedback.trim() ? `店长补充意见：${imageFeedback.trim()}` : "",
      ].filter(Boolean).join("\n");
      const result = await generateScriptMarketingImages(asset?.assetId, {
        includeCover: true,
        includeDetail: false,
        styleProfileId: imageStyleProfileId ?? asset.styleProfileId ?? null,
        promptOverride: promptOverride || null,
      });
      setAssets((current) => current.map((item) => (item?.assetId === result?.assetId ? result : item)));
      setActiveAsset((current) => (current?.assetId === result?.assetId ? result : current));
      setImageAsset(null);
      messageApi.success("图片生成任务已在后台启动，请稍后手动点击“刷新”查看结果");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "图片生成失败");
    } finally {
      setGeneratingImageAssetId(null);
    }
  };

  const imageAction = (asset: ScriptMarketingAssetResult) => {
    if (asset.status !== "approved") {
      return <Typography.Text type="secondary">确认版本后可生成</Typography.Text>;
    }

    if (asset.imageStatus === "ready") {
      return <Tag color="success">主图已就绪</Tag>;
    }

    if (asset.imageStatus === "generating") {
      return <Tag color="processing">主图生成中</Tag>;
    }

    return <Tag color={asset.imageStatus === "failed" ? "error" : "default"}>{asset.imageStatus === "failed" ? "生成失败，可重试" : "待生成主图"}</Tag>;
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
            流程：生成文案草稿 → 确认正式版本 → 在该版本生成主图 → 创建场次复用。美术素材库只作为生图时可选的视觉规律参考。
          </Typography.Text>
          <Space wrap size={24}>
            <Statistic title="全部版本" value={assets.length} suffix="个" />
            <Statistic title="正式版本" value={approvedCount} suffix="个" />
            <Statistic title="最新用途" value={latestAsset?.usageLabel ?? "暂无"} />
            <Statistic title="图片状态" value={latestAsset?.imageStatus === "ready" ? "已就绪" : "待生成"} />
          </Space>
        </Space>
      </Card>

      <Card className="surface-card" title="物料版本">
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
                imageAction(asset)
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
                  {asset.status !== "approved" ? (
                    <Button size="small" type="primary" loading={adoptingAssetId === asset.assetId} onClick={() => void adoptMaterial(asset)}>
                      确认版本
                    </Button>
                  ) : asset.imageStatus !== "ready" && asset.imageStatus !== "generating" ? (
                    <Button size="small" type="primary" loading={generatingImageAssetId === asset.assetId} onClick={() => openImageGeneration(asset)}>
                      {asset.imageStatus === "failed" ? "重试主图" : "生成主图"}
                    </Button>
                  ) : null}
                  <Button size="small" type="text" onClick={() => setActiveAsset(asset)}>
                    {asset.imageStatus === "ready" ? "查看图片" : asset.imageStatus === "generating" ? "查看任务" : "查看版本"}
                  </Button>
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

      <Modal
        title={imageAsset ? `生成主图 · V${imageAsset.versionNo ?? "-"}` : "生成主图"}
        open={Boolean(imageAsset)}
        onCancel={() => setImageAsset(null)}
        onOk={() => void generateImages()}
        confirmLoading={generatingImageAssetId === imageAsset?.assetId}
        okText="提交主图任务"
        cancelText="取消"
        destroyOnHidden
      >
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <Typography.Text type="secondary">
            以下选择只影响本次图片；会叠加到该物料已有的剧本语境、核心画面、构图与负面约束，不会替换完整生图 Prompt。
          </Typography.Text>
          <div>
            <Typography.Text strong>视觉规律参考（可选）</Typography.Text>
            <Select
              allowClear
              style={{ width: "100%", marginTop: 8 }}
              value={imageStyleProfileId}
              onChange={setImageStyleProfileId}
              placeholder="不选择则沿用该物料的参考规律"
              options={styleProfiles.map((profile) => ({
                value: profile.id,
                label: `${profile.name} · ${profile.sampleCount} 套样本`,
              }))}
            />
          </div>
          <div>
            <Typography.Text strong>画面方向（可多选，最多 3 项）</Typography.Text>
            <Select
              mode="multiple"
              maxCount={3}
              style={{ width: "100%", marginTop: 8 }}
              value={imageDirections}
              onChange={setImageDirections}
              placeholder="例如：年轻杂志感、强化人物情绪"
              options={IMAGE_DIRECTION_OPTIONS}
            />
          </div>
          <div>
            <Typography.Text strong>店长本次意见（可选）</Typography.Text>
            <Input.TextArea
              rows={4}
              maxLength={500}
              showCount
              style={{ marginTop: 8 }}
              value={imageFeedback}
              onChange={(event) => setImageFeedback(event.target.value)}
              placeholder="例如：人物情绪更明显，派对信号更直观；不要压抑得像犯罪纪录片；顶部留更多标题空间。"
            />
          </div>
        </Space>
      </Modal>

      <Card className="surface-card" title={`剧本图片素材（${images.length}）`}>
        <Typography.Paragraph type="secondary">
          所有图片都归属当前剧本，可在创建任意场次时自由选择；这里的来源版本仅用于追溯本次图片由哪条运营物料创建。
        </Typography.Paragraph>
        <Table<ScriptMarketingImageResult>
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={images}
          scroll={{ x: 940 }}
          locale={{ emptyText: <Empty description="暂无剧本图片素材。确认任一物料版本后，点击“生成主图”即可创建。" /> }}
          columns={[
            {
              title: "图片",
              width: 120,
              render: (_, image) => image.imageUrl ? <Image src={image.imageUrl} alt="剧本图片素材" style={{ width: 72, height: 96, objectFit: "cover", borderRadius: 8 }} /> : <Tag color={image.status === "failed" ? "error" : "processing"}>{image.status === "failed" ? "生成失败" : "生成中"}</Tag>,
            },
            {
              title: "类型",
              width: 100,
              render: (_, image) => <Tag>{image.imageKind === "detail" ? "详情图" : "主图"}</Tag>,
            },
            {
              title: "来源物料",
              width: 280,
              render: (_, image) => image.sourceTitle ? <Tooltip title={image.sourceTitle}><Typography.Text ellipsis style={{ maxWidth: 240 }}>{`V${image.sourceVersionNo ?? "-"} · ${image.sourceTitle}`}</Typography.Text></Tooltip> : <Typography.Text type="secondary">历史图片</Typography.Text>,
            },
            {
              title: "状态",
              width: 110,
              render: (_, image) => <Tag color={image.status === "ready" ? "success" : image.status === "failed" ? "error" : "processing"}>{image.status === "ready" ? "可复用" : image.status === "failed" ? "失败" : "生成中"}</Tag>,
            },
            {
              title: "创建时间",
              width: 180,
              render: (_, image) => formatDate(image.createdAt),
            },
          ]}
        />
      </Card>

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
        onClose={() => {
          setActiveAsset(null);
          void loadData();
        }}
      >
        {activeAsset ? (
          <ScriptMarketingResult
            result={activeAsset}
            onAdopt={activeAsset.status === "approved" ? undefined : () => void adoptMaterial(activeAsset)}
            onGenerateImages={activeAsset.status === "approved" ? () => openImageGeneration(activeAsset) : undefined}
            adopting={adoptingAssetId === activeAsset.assetId}
            generatingImages={generatingImageAssetId === activeAsset.assetId}
          />
        ) : null}
      </Drawer>
    </Space>
  );
}
