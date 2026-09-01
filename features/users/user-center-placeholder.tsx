"use client";

import { Card, Empty, Timeline, Typography } from "antd";

const descriptions = {
  staff: {
    title: "员工/DM",
    items: ["展示店长、管理员、DM 成员", "支持 DM 邀请码、成员启停、角色调整", "后续可关联 DM 带场统计和玩家评价"],
  },
  guests: {
    title: "游客线索",
    items: ["展示未登录游客 guest_id 行为", "统计 AI 咨询轮次、浏览剧本、触发登录节点", "后续支持游客转正式手机号用户"],
  },
  analytics: {
    title: "用户分析",
    items: ["按来源、偏好、预约、复玩做统计", "沉淀客户标签和热门剧本偏好", "后续接 AI 辅助运营建议"],
  },
} as const;

export function UserCenterPlaceholder({ type }: { type: keyof typeof descriptions }) {
  const data = descriptions[type];
  return (
    <Card className="surface-card">
      <Empty description={`${data.title} 功能骨架已预留`} />
      <Typography.Paragraph type="secondary" style={{ marginTop: 18 }}>
        这里先作为用户中心子模块入口，等后端数据表进一步补齐后直接接接口。
      </Typography.Paragraph>
      <Timeline items={data.items.map((item) => ({ children: item }))} />
    </Card>
  );
}
