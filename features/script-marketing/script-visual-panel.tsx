"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DeleteOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Card, Descriptions, Drawer, Empty, Input, Modal, Popconfirm, Select, Space, Table, Tag, Tooltip, Typography, message } from "antd";
import {
  approveScriptVisualProfile,
  deleteScriptVisualAsset,
  generateScriptVisualAssets,
  generateScriptVisualProfile,
  getScriptVisualProfile,
  listScriptVisualAssets,
  listVisualStylePresets,
  selectScriptVisualAsset,
  type ScriptVisualAssetResult,
  type ScriptVisualProfileResult,
  type VisualStylePresetResult,
} from "@/lib/script-visual/script-visual-api";

const VISUAL_USAGE_OPTIONS = [
  { label: "拼车主图", value: "session_cover", ratio: "1:1" },
  { label: "详情氛围图", value: "session_detail", ratio: "3:4" },
  { label: "朋友圈海报背景", value: "moments_poster", ratio: "9:16" },
  { label: "人物视觉图", value: "character_portrait", ratio: "3:4" },
];

function formatDate(value?: string | null): string {
  if (!value) return "暂无";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function tagList(values?: string[]) {
  if (!values?.length) return <Typography.Text type="secondary">暂无</Typography.Text>;
  return (
    <Space size={4} wrap>
      {values.map((item) => (
        <Tag key={item}>{item}</Tag>
      ))}
    </Space>
  );
}

export function ScriptVisualPanel({ documentId }: { documentId: string }) {
  const [profile, setProfile] = useState<ScriptVisualProfileResult | null>(null);
  const [styles, setStyles] = useState<VisualStylePresetResult[]>([]);
  const [assets, setAssets] = useState<ScriptVisualAssetResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingProfile, setGeneratingProfile] = useState(false);
  const [generatingAsset, setGeneratingAsset] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [activeAsset, setActiveAsset] = useState<ScriptVisualAssetResult | null>(null);
  const [usageType, setUsageType] = useState(VISUAL_USAGE_OPTIONS[0].value);
  const [stylePresetId, setStylePresetId] = useState<string | undefined>();
  const [aspectRatio, setAspectRatio] = useState(VISUAL_USAGE_OPTIONS[0].ratio);
  const [count, setCount] = useState(2);
  const [extraRequirement, setExtraRequirement] = useState("");
  const [messageApi, contextHolder] = message.useMessage();

  const usageOption = useMemo(
    () => VISUAL_USAGE_OPTIONS.find((item) => item.value === usageType) ?? VISUAL_USAGE_OPTIONS[0],
    [usageType],
  );

  const sortedAssets = useMemo(
    () => [...assets].sort((a, b) => Number(b.isSelected) - Number(a.isSelected) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [assets],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileResult, styleRows, assetRows] = await Promise.all([
        getScriptVisualProfile(documentId),
        listVisualStylePresets(),
        listScriptVisualAssets(documentId),
      ]);
      setProfile(profileResult);
      setStyles(styleRows);
      setAssets(assetRows);
      setStylePresetId((current) => current ?? styleRows[0]?.id);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "视觉素材加载失败");
    } finally {
      setLoading(false);
    }
  }, [documentId, messageApi]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  const createProfile = async () => {
    setGeneratingProfile(true);
    try {
      const result = await generateScriptVisualProfile(documentId, { extraRequirement: "用于门店拼车主图、详情图和朋友圈宣传图，避免剧透和版权风险。" });
      setProfile(result);
      messageApi.success("剧本视觉档案已生成");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "视觉档案生成失败");
    } finally {
      setGeneratingProfile(false);
    }
  };

  const approveProfile = async () => {
    if (!profile?.id) return;
    setGeneratingProfile(true);
    try {
      const result = await approveScriptVisualProfile(profile.id);
      setProfile(result);
      messageApi.success("视觉档案已确认");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "视觉档案确认失败");
    } finally {
      setGeneratingProfile(false);
    }
  };

  const createAssets = async () => {
    setGeneratingAsset(true);
    try {
      const rows = await generateScriptVisualAssets(documentId, {
        visualProfileId: profile?.id,
        stylePresetId,
        usageType,
        usageLabel: usageOption.label,
        aspectRatio,
        count,
        extraRequirement: extraRequirement.trim() || null,
      });
      setAssets((current) => [...rows, ...current]);
      setGenerateOpen(false);
      messageApi.success("视觉素材候选已生成");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "视觉素材生成失败");
    } finally {
      setGeneratingAsset(false);
    }
  };

  const selectAsset = async (asset: ScriptVisualAssetResult) => {
    try {
      const result = await selectScriptVisualAsset(asset.id);
      setAssets((current) => current.map((item) => (item.id === result.id ? result : { ...item, isSelected: item.usageType === result.usageType ? false : item.isSelected })));
      setActiveAsset((current) => (current?.id === result.id ? result : current));
      messageApi.success("已设为正式视觉素材");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "确认素材失败");
    }
  };

  const removeAsset = async (asset: ScriptVisualAssetResult) => {
    try {
      await deleteScriptVisualAsset(asset.id);
      setAssets((current) => current.filter((item) => item.id !== asset.id));
      if (activeAsset?.id === asset.id) setActiveAsset(null);
      messageApi.success("视觉素材已删除");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "删除素材失败");
    }
  };

  return (
    <Card className="surface-card" title="AI 视觉素材" loading={loading}>
      {contextHolder}
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={() => void loadData()}>
            刷新
          </Button>
          <Button type="primary" loading={generatingProfile} onClick={() => void createProfile()}>
            {profile ? "重新生成视觉档案" : "生成视觉档案"}
          </Button>
          {profile && profile.status !== "approved" ? (
            <Button loading={generatingProfile} onClick={() => void approveProfile()}>
              确认视觉档案
            </Button>
          ) : null}
          <Button icon={<PlusOutlined />} disabled={!profile} onClick={() => setGenerateOpen(true)}>
            生成候选图 Prompt
          </Button>
        </Space>

        {profile ? (
          <Descriptions size="small" bordered column={{ xs: 1, sm: 2, md: 3 }}>
            <Descriptions.Item label="视觉状态">
              <Tag color={profile.status === "approved" ? "success" : "processing"}>{profile.status === "approved" ? "已确认" : "待确认"}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="完整度">{profile.confidenceScore ?? "暂无"}</Descriptions.Item>
            <Descriptions.Item label="时代背景">{profile.era || "暂无"}</Descriptions.Item>
            <Descriptions.Item label="主色调">{tagList(profile.colorPalette)}</Descriptions.Item>
            <Descriptions.Item label="氛围">{tagList(profile.atmosphereKeywords)}</Descriptions.Item>
            <Descriptions.Item label="视觉符号">{tagList(profile.visualSymbols)}</Descriptions.Item>
          </Descriptions>
        ) : (
          <Empty description="暂无视觉档案。先生成视觉档案，再生成主图、详情图、朋友圈图 Prompt。" />
        )}

        <Table<ScriptVisualAssetResult>
          rowKey="id"
          size="small"
          dataSource={sortedAssets}
          scroll={{ x: 1040 }}
          locale={{ emptyText: <Empty description="暂无视觉素材候选" /> }}
          columns={[
            {
              title: "用途",
              width: 130,
              render: (_, asset) => <Tag color="blue">{asset.usageLabel}</Tag>,
            },
            {
              title: "状态",
              width: 110,
              render: (_, asset) => (
                <Tag color={asset.isSelected ? "success" : asset.status === "failed" ? "error" : "default"}>
                  {asset.isSelected ? "正式使用" : asset.status === "failed" ? "失败" : "候选"}
                </Tag>
              ),
            },
            { title: "比例", dataIndex: "aspectRatio", width: 90 },
            {
              title: "Prompt",
              dataIndex: "prompt",
              ellipsis: true,
              width: 360,
              render: (value: string) => (
                <Tooltip title={value}>
                  <Typography.Text>{value}</Typography.Text>
                </Tooltip>
              ),
            },
            {
              title: "创建时间",
              width: 170,
              render: (_, asset) => formatDate(asset.createdAt),
            },
            {
              title: "操作",
              width: 220,
              fixed: "right",
              render: (_, asset) => (
                <Space size={4}>
                  <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => setActiveAsset(asset)}>
                    详情
                  </Button>
                  {!asset.isSelected ? (
                    <Button size="small" type="text" onClick={() => void selectAsset(asset)}>
                      确认
                    </Button>
                  ) : null}
                  <Popconfirm title="确认删除这条候选素材？" okText="删除" cancelText="取消" onConfirm={() => void removeAsset(asset)}>
                    <Button size="small" danger type="text" icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Space>

      <Modal
        title="生成视觉素材候选"
        open={generateOpen}
        onCancel={() => setGenerateOpen(false)}
        onOk={() => void createAssets()}
        confirmLoading={generatingAsset}
        okText="开始生成"
        cancelText="取消"
        destroyOnHidden
      >
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <div>
            <Typography.Text strong>素材用途</Typography.Text>
            <Select
              style={{ width: "100%", marginTop: 8 }}
              value={usageType}
              onChange={(value) => {
                setUsageType(value);
                setAspectRatio(VISUAL_USAGE_OPTIONS.find((item) => item.value === value)?.ratio ?? "1:1");
              }}
              options={VISUAL_USAGE_OPTIONS.map((item) => ({ label: item.label, value: item.value }))}
            />
          </div>
          <div>
            <Typography.Text strong>视觉风格</Typography.Text>
            <Select
              style={{ width: "100%", marginTop: 8 }}
              value={stylePresetId}
              onChange={setStylePresetId}
              options={styles.map((item) => ({ label: item.name, value: item.id }))}
            />
          </div>
          <Space style={{ width: "100%" }} size={12}>
            <div style={{ flex: 1 }}>
              <Typography.Text strong>图片比例</Typography.Text>
              <Select
                style={{ width: "100%", marginTop: 8 }}
                value={aspectRatio}
                onChange={setAspectRatio}
                options={["1:1", "3:4", "9:16", "16:9"].map((item) => ({ label: item, value: item }))}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Typography.Text strong>候选数量</Typography.Text>
              <Select
                style={{ width: "100%", marginTop: 8 }}
                value={count}
                onChange={setCount}
                options={[1, 2, 3, 4].map((item) => ({ label: `${item} 条`, value: item }))}
              />
            </div>
          </Space>
          <div>
            <Typography.Text strong>补充要求</Typography.Text>
            <Input.TextArea
              rows={4}
              maxLength={800}
              showCount
              style={{ marginTop: 8 }}
              value={extraRequirement}
              onChange={(event) => setExtraRequirement(event.target.value)}
              placeholder="例如：更接近民国电影海报、不要卡通、主角用剪影、适合微信朋友圈竖图"
            />
          </div>
        </Space>
      </Modal>

      <Drawer title="视觉素材 Prompt" width={720} open={Boolean(activeAsset)} onClose={() => setActiveAsset(null)}>
        {activeAsset ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="用途">{activeAsset.usageLabel}</Descriptions.Item>
              <Descriptions.Item label="比例">{activeAsset.aspectRatio}</Descriptions.Item>
              <Descriptions.Item label="状态">{activeAsset.isSelected ? "正式使用" : activeAsset.status}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{formatDate(activeAsset.createdAt)}</Descriptions.Item>
            </Descriptions>
            <div>
              <Typography.Title level={5}>正向 Prompt</Typography.Title>
              <Typography.Paragraph copyable style={{ whiteSpace: "pre-wrap" }}>
                {activeAsset.prompt}
              </Typography.Paragraph>
            </div>
            {activeAsset.negativePrompt ? (
              <div>
                <Typography.Title level={5}>负向 Prompt</Typography.Title>
                <Typography.Paragraph copyable style={{ whiteSpace: "pre-wrap" }}>
                  {activeAsset.negativePrompt}
                </Typography.Paragraph>
              </div>
            ) : null}
          </Space>
        ) : null}
      </Drawer>
    </Card>
  );
}
