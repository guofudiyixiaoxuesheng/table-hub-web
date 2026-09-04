"use client";

import { Button, Card, Collapse, Image, Space, Tag, Typography } from "antd";
import type { ScriptMarketingAssetResult } from "@/lib/script-marketing/script-marketing-api";

export function ScriptMarketingResult({
  result,
  onAdopt,
  onRegenerate,
  onGenerateImages,
  adopting = false,
  regenerating = false,
  generatingImages = false,
}: {
  result: ScriptMarketingAssetResult;
  onAdopt?: () => void;
  onRegenerate?: () => void;
  onGenerateImages?: () => void;
  adopting?: boolean;
  regenerating?: boolean;
  generatingImages?: boolean;
}) {
  const detailImageUrls = result.detailImageUrls ?? [];
  const imageStatusLabel = {
    not_started: "未生成图片",
    generating: "图片生成中",
    ready: "图片已可用",
    failed: "图片生成失败",
  }[result.imageStatus || "not_started"] || result.imageStatus;

  return (
    <Space direction="vertical" size={14} style={{ width: "100%" }}>
      <Card size="small" title={result.status === "approved" ? "正式物料版本" : "AI 草稿"}>
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          <Typography.Title level={5} style={{ margin: 0 }}>{result.title}</Typography.Title>
          <Typography.Paragraph style={{ marginBottom: 0 }}>{result.summary}</Typography.Paragraph>
          <Space wrap>
            {result.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
            <Tag color={result.imageStatus === "ready" ? "success" : result.imageStatus === "failed" ? "error" : "default"}>
              {imageStatusLabel}
            </Tag>
          </Space>
          {result.coverImageUrl ? <Image src={result.coverImageUrl} alt="AI 主图" style={{ maxWidth: 220, borderRadius: 14 }} /> : null}
          {detailImageUrls.length ? (
            <Space wrap>
              {detailImageUrls.map((url) => <Image key={url} src={url} alt="AI 详情图" style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 12 }} />)}
            </Space>
          ) : null}
          {result.imageErrorMessage ? <Typography.Text type="danger">{result.imageErrorMessage}</Typography.Text> : null}
          {(onAdopt || onRegenerate || onGenerateImages) ? (
            <Space wrap>
              {onAdopt ? <Button type="primary" loading={adopting} onClick={onAdopt}>确定使用</Button> : null}
              {onRegenerate ? <Button loading={regenerating} onClick={onRegenerate}>填写意见重新生成</Button> : null}
              {onGenerateImages ? (
                <Button loading={generatingImages} onClick={onGenerateImages} disabled={result.status !== "approved"}>
                  生成主图/详情图
                </Button>
              ) : null}
            </Space>
          ) : null}
        </Space>
      </Card>
      <Collapse
        defaultActiveKey={["copy", "cover"]}
        items={[
          {
            key: "copy",
            label: "详情页文案",
            children: <Typography.Paragraph copyable={{ text: result.detailCopy }}>{result.detailCopy}</Typography.Paragraph>,
          },
          {
            key: "cover",
            label: "主图 Prompt",
            children: <Typography.Paragraph copyable={{ text: result.coverPrompt }}>{result.coverPrompt}</Typography.Paragraph>,
          },
          {
            key: "detailImages",
            label: "详情图 Prompt",
            children: (
              <Space direction="vertical" style={{ width: "100%" }}>
                {result.detailImagePrompts.map((prompt, index) => (
                  <Typography.Paragraph key={`${index}-${prompt}`} copyable={{ text: prompt }}>
                    {index + 1}. {prompt}
                  </Typography.Paragraph>
                ))}
              </Space>
            ),
          },
          {
            key: "points",
            label: "关键词 / 适合人群 / 风险提醒",
            children: (
              <Space direction="vertical" size={10}>
                <div>
                  <Typography.Text type="secondary">中文关键词</Typography.Text>
                  <div>{result.sellingPoints.map((item) => <Tag key={item}>{item}</Tag>)}</div>
                </div>
                <div>
                  <Typography.Text type="secondary">适合人群</Typography.Text>
                  <div>{result.suitablePlayers.map((item) => <Tag key={item}>{item}</Tag>)}</div>
                </div>
                <div>
                  <Typography.Text type="secondary">风险提醒</Typography.Text>
                  <div>{result.riskNotes.map((item) => <Tag key={item} color="warning">{item}</Tag>)}</div>
                </div>
              </Space>
            ),
          },
          {
            key: "sources",
            label: "RAG 来源",
            children: (
              <Space direction="vertical" size={4}>
                {result.sources.map((source) => <Typography.Text key={source} type="secondary">{source}</Typography.Text>)}
              </Space>
            ),
          },
        ]}
      />
    </Space>
  );
}
