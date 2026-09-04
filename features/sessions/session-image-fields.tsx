"use client";

import { useEffect, useState } from "react";
import { AppstoreAddOutlined, LinkOutlined, PictureOutlined } from "@ant-design/icons";
import { Alert, Button, Form, Image, Input, Select, Space, Typography } from "antd";
import type { FormInstance } from "antd";
import {
  listScriptImageOptions,
  type GameSessionImageSource,
  type GameSessionPayload,
  type SessionImageAssetOption,
} from "@/lib/game-sessions/game-session-api";
import styles from "./sessions.module.css";

const sourceOptions: { value: GameSessionImageSource; label: string; disabled?: boolean }[] = [
  { value: "manual", label: "手动填写图片地址" },
  { value: "knowledge_asset", label: "从剧本资料图片中选择" },
  { value: "ai_generated", label: "AI 正式物料图片" },
];

function normalizeDetailUrls(value?: string[] | string | null) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function SessionImageFields({ form }: { form: FormInstance<GameSessionPayload> }) {
  const scriptDocumentId = Form.useWatch("scriptDocumentId", form);
  const coverImageSource = Form.useWatch("coverImageSource", form);
  const detailImageSource = Form.useWatch("detailImageSource", form);
  const coverImageAssetId = Form.useWatch("coverImageAssetId", form);
  const detailImageAssetIds = Form.useWatch("detailImageAssetIds", form) ?? [];
  const coverImageUrl = Form.useWatch("coverImageUrl", form);
  const detailImageUrls = normalizeDetailUrls(Form.useWatch("detailImageUrls", form));
  const [assets, setAssets] = useState<SessionImageAssetOption[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!scriptDocumentId) {
        setAssets([]);
        return;
      }
      setLoadingAssets(true);
      listScriptImageOptions(scriptDocumentId)
        .then(setAssets)
        .catch(() => setAssets([]))
        .finally(() => setLoadingAssets(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [scriptDocumentId]);

  const assetOptions = assets.map((asset) => ({
    value: asset.id,
    label: asset.pageNumber ? `${asset.label} · 第 ${asset.pageNumber} 页` : asset.label,
  }));
  const coverPreviewUrl =
    coverImageSource === "knowledge_asset"
      ? assets.find((asset) => asset.id === coverImageAssetId)?.previewUrl
      : coverImageUrl;
  const detailPreviewUrls =
    detailImageSource === "knowledge_asset"
      ? detailImageAssetIds
          .map((assetId) => assets.find((asset) => asset.id === assetId)?.previewUrl)
          .filter((url): url is string => Boolean(url))
      : detailImageUrls;

  return (
    <div className={styles.imageFields}>
      <Typography.Title level={5}>玩家展示图片</Typography.Title>
      <Typography.Text type="secondary">
        主图会展示在场次卡片和玩家预约入口；详情图会展示在场次详情里，适合放海报、角色图、卖点介绍。
      </Typography.Text>

      <div className={styles.formGrid}>
        <Form.Item name="coverImageSource" label="主图来源" initialValue="manual">
          <Select options={sourceOptions} />
        </Form.Item>
        <Form.Item noStyle shouldUpdate={(prev, next) => prev.coverImageSource !== next.coverImageSource}>
          {({ getFieldValue }) => {
            const source = getFieldValue("coverImageSource");
            return source === "knowledge_asset" ? (
              <Form.Item name="coverImageAssetId" label="选择主图">
                <Select
                  allowClear
                  showSearch
                  loading={loadingAssets}
                  optionFilterProp="label"
                  placeholder="从当前剧本已解析图片中选择"
                  options={assetOptions}
                />
              </Form.Item>
            ) : (
              <Form.Item name="coverImageUrl" label="主图地址">
                <Input prefix={<LinkOutlined />} placeholder="https://.../cover.jpg" />
              </Form.Item>
            );
          }}
        </Form.Item>
      </div>

      {coverPreviewUrl ? <Image src={coverPreviewUrl} alt="场次主图预览" className={styles.coverPreview} /> : null}

      <div className={styles.formGrid}>
        <Form.Item name="detailImageSource" label="详情图来源" initialValue="manual">
          <Select options={sourceOptions} />
        </Form.Item>
        <Form.Item noStyle shouldUpdate={(prev, next) => prev.detailImageSource !== next.detailImageSource}>
          {({ getFieldValue, setFieldValue }) => {
            const source = getFieldValue("detailImageSource");
            return source === "knowledge_asset" ? (
              <Form.Item name="detailImageAssetIds" label="选择详情图">
                <Select
                  allowClear
                  mode="multiple"
                  showSearch
                  loading={loadingAssets}
                  optionFilterProp="label"
                  placeholder="可选择多张图片"
                  options={assetOptions}
                />
              </Form.Item>
            ) : (
              <Form.Item label="详情图地址">
                <Input.TextArea
                  rows={3}
                  placeholder="一行一个图片地址"
                  value={detailImageUrls.join("\n")}
                  onChange={(event) => setFieldValue("detailImageUrls", normalizeDetailUrls(event.target.value))}
                />
              </Form.Item>
            );
          }}
        </Form.Item>
      </div>

      {detailPreviewUrls.length ? (
        <Space wrap>
          {detailPreviewUrls.slice(0, 6).map((url) => (
            <Image key={url} src={url} alt="详情图预览" className={styles.detailPreview} />
          ))}
        </Space>
      ) : null}

      <Alert
        type="info"
        showIcon
        icon={<PictureOutlined />}
        message="当前先支持填写图片地址，或从剧本资料解析出来的图片里选择；AI 生成图后续可以继续接到这里。"
        description="如果在知识库详情页已为正式物料生成图片，创建场次选择该物料后会自动填入这里。"
        action={
          <Button size="small" icon={<AppstoreAddOutlined />} disabled>
            去知识库生成
          </Button>
        }
      />
    </div>
  );
}
