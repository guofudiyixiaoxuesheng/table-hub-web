"use client";

import { useEffect, useState } from "react";
import { BarChartOutlined, FireOutlined, TeamOutlined, WarningOutlined } from "@ant-design/icons";
import { Card, List, Progress, Skeleton, Space, Statistic, Tag, Typography, message } from "antd";
import { SCRIPT_GENRE_OPTIONS } from "@/lib/oss/knowledge-resource-types";
import { getPlayerAnalytics, type StorePlayerAnalytics } from "@/lib/players/player-api";

const scriptGenreLabelMap = new Map(SCRIPT_GENRE_OPTIONS.map((item) => [item.value, item.label]));

function formatScriptGenre(value?: string | null) {
  if (!value) return "未分类";
  return scriptGenreLabelMap.get(value as never) ?? value;
}

function formatMoney(priceCents: number) {
  return `¥${(priceCents / 100).toFixed(0)}`;
}

function playerName(item: Record<string, unknown>) {
  return String(item.nickname || item.phone || "未命名玩家");
}

export function UserAnalyticsDashboard() {
  const [data, setData] = useState<StorePlayerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      getPlayerAnalytics()
        .then(setData)
        .catch((error) => messageApi.error(error instanceof Error ? error.message : "用户分析加载失败"))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [messageApi]);

  if (loading) return <Skeleton active />;
  if (!data) return null;

  return (
    <div className="page-grid">
      {contextHolder}
      <Card className="surface-card span-4">
        <Statistic title="客户池玩家" value={data.total_players} prefix={<TeamOutlined />} />
      </Card>
      <Card className="surface-card span-4">
        <Statistic title="累计预约" value={data.reservation_count} prefix={<BarChartOutlined />} />
      </Card>
      <Card className="surface-card span-4">
        <Statistic title="消费估算" value={formatMoney(data.estimated_revenue_cents)} />
      </Card>
      <Card className="surface-card span-12">
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Text type="secondary">AI 辅助分析</Typography.Text>
          <Typography.Title level={3} style={{ margin: 0 }}>{data.ai_summary}</Typography.Title>
          <Progress percent={Math.round(data.cancellation_rate * 100)} status={data.cancellation_rate > 0.3 ? "exception" : "normal"} />
          <Typography.Text type="secondary">取消率用于观察跳车风险；后续可结合聊天、评分和到店核销做更准确的用户画像。</Typography.Text>
        </Space>
      </Card>
      <Card className="surface-card span-6" title={<Space><FireOutlined />热门剧本类型</Space>}>
        <List
          dataSource={data.top_genres}
          locale={{ emptyText: "暂无类型数据" }}
          renderItem={(item, index) => (
            <List.Item extra={<Tag color="orange">{item.count} 次</Tag>}>
              <List.Item.Meta title={`${index + 1}. ${formatScriptGenre(item.genre)}`} description="基于有效预约统计" />
            </List.Item>
          )}
        />
      </Card>
      <Card className="surface-card span-6" title={<Space><TeamOutlined />高活跃玩家</Space>}>
        <List
          dataSource={data.active_players}
          locale={{ emptyText: "暂无活跃玩家" }}
          renderItem={(item) => (
            <List.Item extra={<Tag color="green">{String(item.reservationCount || 0)} 次</Tag>}>
              <List.Item.Meta title={playerName(item)} description={`完成 ${String(item.completedCount || 0)} 次 · 取消 ${String(item.cancelledCount || 0)} 次`} />
            </List.Item>
          )}
        />
      </Card>
      <Card className="surface-card span-12" title={<Space><WarningOutlined />需要关注的玩家</Space>}>
        <List
          dataSource={data.risk_players}
          locale={{ emptyText: "暂无明显跳车风险" }}
          renderItem={(item) => (
            <List.Item extra={<Tag color="red">取消 {String(item.cancelledCount || 0)} 次</Tag>}>
              <List.Item.Meta title={playerName(item)} description={`累计预约 ${String(item.reservationCount || 0)} 次，可在下次组局前人工确认`} />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
}
