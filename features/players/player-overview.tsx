"use client";

import { ClockCircleOutlined, FireOutlined, TeamOutlined, TrophyOutlined } from "@ant-design/icons";
import { Avatar, Card, List, Progress, Space, Statistic, Tag, Typography } from "antd";

const players = [
  { name: "林小野", level: "资深玩家", preference: "情感沉浸", games: 18 },
  { name: "周予安", level: "核心玩家", preference: "硬核推理", games: 14 },
  { name: "Momo", level: "新晋玩家", preference: "欢乐机制", games: 5 },
];

export function PlayerOverview() {
  return (
    <div className="page-grid">
      {[{ title: "累计玩家", value: 286, icon: <TeamOutlined /> }, { title: "本月活跃", value: 84, icon: <FireOutlined /> }, { title: "复玩率", value: "68%", icon: <TrophyOutlined /> }].map((item) => (
        <Card key={item.title} className="surface-card span-4"><Statistic title={item.title} value={item.value} prefix={item.icon} /></Card>
      ))}
      <Card className="surface-card span-8" title="活跃玩家">
        <List dataSource={players} renderItem={(player) => (
          <List.Item extra={<Tag>{player.games} 场</Tag>}>
            <List.Item.Meta avatar={<Avatar style={{ background: "#6d5dfc" }}>{player.name.slice(0, 1)}</Avatar>} title={player.name} description={<Space><span>{player.level}</span><span>偏好：{player.preference}</span></Space>} />
          </List.Item>
        )} />
      </Card>
      <Card className="surface-card span-4" title="玩家成长">
        <Space orientation="vertical" size={18} style={{ width: "100%" }}>
          <Typography.Text><ClockCircleOutlined /> 近 30 天新增 32 位玩家</Typography.Text>
          <div><Typography.Text type="secondary">首次到店转化</Typography.Text><Progress percent={73} strokeColor="#6d5dfc" /></div>
          <div><Typography.Text type="secondary">二次复玩转化</Typography.Text><Progress percent={68} strokeColor="#3d9b86" /></div>
        </Space>
      </Card>
    </div>
  );
}
