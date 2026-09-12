"use client";

import { Button, Card, Descriptions, Image, Space, Tabs, Tag, Typography } from "antd";
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
  const playerCard = result.playerCard ?? {};
  const playerDetail = result.playerDetail ?? {};
  const moments = result.moments ?? {};
  const sessionDefaults = result.sessionFormDefaults ?? {};
  const cardTitle = playerCard.title || result.title;
  const cardSummary = playerCard.summary || result.summary;
  const cardCoverPrompt = playerCard.coverPrompt || result.coverPrompt;
  const detailCopy = playerDetail.detailCopy || result.detailCopy;
  const detailPrompts = playerDetail.imagePrompts?.length ? playerDetail.imagePrompts : result.detailImagePrompts;
  const normalizedDetailImageUrls = playerDetail.imageUrls?.length ? playerDetail.imageUrls : detailImageUrls;
  const momentsCopy = moments.copy || result.detailCopy;
  const momentsPosterPrompt = moments.posterPrompt || result.coverPrompt;
  const coverImageUrl = playerCard.coverImageUrl || result.coverImageUrl;
  const posterImageUrl = moments.posterImageUrl || coverImageUrl;
  const finalImagePrompts = result.finalImagePrompts ?? {};
  const imageGenerations = result.imageGenerations ?? [];
  const isPromptPreview = result.imageStatus === "ready"
    && Boolean(finalImagePrompts.cover || finalImagePrompts.details?.length)
    && !coverImageUrl
    && !normalizedDetailImageUrls.length;
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
          <Space wrap>
            <Typography.Title level={5} style={{ margin: 0 }}>{result.title}</Typography.Title>
            <Tag color={result.status === "approved" ? "success" : "processing"}>
              {result.usageLabel || "拼车招募版"}
            </Tag>
          </Space>
          <Typography.Paragraph style={{ marginBottom: 0 }}>{result.summary}</Typography.Paragraph>
          <Space wrap>
            {result.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
            <Tag color={result.imageStatus === "ready" ? "success" : result.imageStatus === "failed" ? "error" : "default"}>
              {isPromptPreview ? "提示词模拟完成" : imageStatusLabel}
            </Tag>
          </Space>
          {isPromptPreview ? <Typography.Text type="secondary">当前未调用生图模型；请到“实际生图 Prompt”标签页检查最终提示词。</Typography.Text> : null}
          {coverImageUrl ? <Image src={coverImageUrl} alt="AI 主图" style={{ maxWidth: 220, borderRadius: 14 }} /> : null}
          {normalizedDetailImageUrls.length ? (
            <Space wrap>
              {normalizedDetailImageUrls.map((url) => <Image key={url} src={url} alt="AI 详情图" style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 12 }} />)}
            </Space>
          ) : null}
          {result.imageErrorMessage ? <Typography.Text type="danger">{result.imageErrorMessage}</Typography.Text> : null}
          {(onAdopt || onRegenerate || onGenerateImages) ? (
            <Space wrap>
              {onAdopt ? <Button type="primary" loading={adopting} onClick={onAdopt}>确定使用</Button> : null}
              {onRegenerate ? <Button loading={regenerating} onClick={onRegenerate}>填写意见重新生成</Button> : null}
              {onGenerateImages ? (
                <Button loading={generatingImages} onClick={onGenerateImages} disabled={result.status !== "approved"}>
                  生成主图
                </Button>
              ) : null}
            </Space>
          ) : null}
        </Space>
      </Card>
      <Card size="small" title={`图片列表（${imageGenerations.length} 次）`}>
        {imageGenerations.length ? (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            {imageGenerations.map((generation, index) => {
              const urls = [generation.coverImageUrl, ...(generation.detailImageUrls ?? [])].filter(
                (url): url is string => Boolean(url),
              );
              const statusLabel = generation.status === "ready"
                ? "已生成"
                : generation.status === "failed"
                  ? "生成失败"
                  : "生成中";
              return (
                <Card key={generation.id || index} size="small">
                  <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    <Space wrap>
                      <Typography.Text strong>第 {imageGenerations.length - index} 次</Typography.Text>
                      <Tag color={generation.status === "ready" ? "success" : generation.status === "failed" ? "error" : "processing"}>
                        {statusLabel}
                      </Tag>
                      {generation.createdAt ? <Typography.Text type="secondary">{new Date(generation.createdAt).toLocaleString()}</Typography.Text> : null}
                    </Space>
                    {urls.length ? (
                      <Image.PreviewGroup>
                        <Space wrap>
                          {urls.map((url) => (
                            <Image key={url} src={url} alt="AI 生成图片" style={{ width: 132, height: 176, objectFit: "cover", borderRadius: 10 }} />
                          ))}
                        </Space>
                      </Image.PreviewGroup>
                    ) : null}
                    {generation.errorMessage ? <Typography.Text type="danger">{generation.errorMessage}</Typography.Text> : null}
                    {generation.finalImagePrompts?.cover ? <Typography.Text type="secondary">已保存本次最终提示词，可在下方“实际生图 Prompt”中查看最新一次。</Typography.Text> : null}
                  </Space>
                </Card>
              );
            })}
          </Space>
        ) : <Typography.Text type="secondary">尚无图片生成记录。生成任务启动后会立即出现在这里；请手动点击“刷新”查看结果。</Typography.Text>}
      </Card>
      <Tabs
        defaultActiveKey="session"
        items={[
          {
            key: "session",
            label: "场次表单",
            children: (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Typography.Text type="secondary">创建场次时，选择正式物料后会优先填充这些字段。</Typography.Text>
                <Descriptions size="small" column={1} bordered>
                  <Descriptions.Item label="场次标题">{sessionDefaults.title || "暂无"}</Descriptions.Item>
                  <Descriptions.Item label="场次简介">{sessionDefaults.description || "暂无"}</Descriptions.Item>
                  <Descriptions.Item label="人数">{sessionDefaults.minPlayers || "?"} - {sessionDefaults.capacity || "?"} 人</Descriptions.Item>
                  <Descriptions.Item label="时长">{sessionDefaults.durationMinutes ? `${sessionDefaults.durationMinutes} 分钟` : "暂无"}</Descriptions.Item>
                  <Descriptions.Item label="价格">{sessionDefaults.priceYuan ? `¥${sessionDefaults.priceYuan}` : "暂无"}</Descriptions.Item>
                  <Descriptions.Item label="备注">{sessionDefaults.notes || "暂无"}</Descriptions.Item>
                </Descriptions>
              </Space>
            ),
          },
          {
            key: "card",
            label: "玩家卡片",
            children: (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Typography.Title level={5} style={{ margin: 0 }}>{cardTitle}</Typography.Title>
                {playerCard.subtitle ? <Typography.Text type="secondary">{playerCard.subtitle}</Typography.Text> : null}
                <Typography.Paragraph copyable={{ text: cardSummary }}>{cardSummary}</Typography.Paragraph>
                <Typography.Text type="secondary">主图 Prompt</Typography.Text>
                <Typography.Paragraph copyable={{ text: cardCoverPrompt }}>{cardCoverPrompt}</Typography.Paragraph>
              </Space>
            ),
          },
          {
            key: "detail",
            label: "详情页",
            children: (
              <Space direction="vertical" style={{ width: "100%" }}>
                <Typography.Paragraph copyable={{ text: detailCopy }}>{detailCopy}</Typography.Paragraph>
                <Typography.Text type="secondary">详情图 Prompt</Typography.Text>
                {detailPrompts.map((prompt, index) => (
                  <Typography.Paragraph key={`${index}-${prompt}`} copyable={{ text: prompt }}>
                    {index + 1}. {prompt}
                  </Typography.Paragraph>
                ))}
              </Space>
            ),
          },
          {
            key: "moments",
            label: "朋友圈",
            children: (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Typography.Title level={5} style={{ margin: 0 }}>{moments.posterTitle || result.title}</Typography.Title>
                {moments.posterSubtitle ? <Typography.Text type="secondary">{moments.posterSubtitle}</Typography.Text> : null}
                {posterImageUrl ? <Image src={posterImageUrl} alt="朋友圈海报" style={{ maxWidth: 220, borderRadius: 14 }} /> : null}
                <Typography.Text type="secondary">朋友圈文案</Typography.Text>
                <Typography.Paragraph copyable={{ text: momentsCopy }}>{momentsCopy}</Typography.Paragraph>
                <Typography.Text type="secondary">海报 Prompt</Typography.Text>
                <Typography.Paragraph copyable={{ text: momentsPosterPrompt }}>{momentsPosterPrompt}</Typography.Paragraph>
              </Space>
            ),
          },
          {
            key: "final-prompts",
            label: "实际生图 Prompt",
            children: (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Typography.Text type="secondary">
                  以下是实际发送给生图模型的生产级提示词：已补齐剧本语境、构图、媒介、光影与负面约束；选择视觉规律档案时会额外叠加对应规律。
                </Typography.Text>
                {finalImagePrompts.cover ? (
                  <>
                    <Typography.Text strong>主图最终 Prompt</Typography.Text>
                    <Typography.Paragraph copyable={{ text: finalImagePrompts.cover }} style={{ whiteSpace: "pre-wrap" }}>
                      {finalImagePrompts.cover}
                    </Typography.Paragraph>
                  </>
                ) : null}
                {(finalImagePrompts.details ?? []).map((prompt, index) => (
                  <div key={`${index}-${prompt}`}>
                    <Typography.Text strong>详情图 {index + 1} 最终 Prompt</Typography.Text>
                    <Typography.Paragraph copyable={{ text: prompt }} style={{ whiteSpace: "pre-wrap" }}>
                      {prompt}
                    </Typography.Paragraph>
                  </div>
                ))}
                {!finalImagePrompts.cover && !(finalImagePrompts.details ?? []).length ? <Typography.Text type="secondary">尚未生成图片。</Typography.Text> : null}
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
