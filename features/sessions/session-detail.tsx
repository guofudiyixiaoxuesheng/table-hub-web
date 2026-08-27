"use client";

import { ArrowLeftOutlined, CalendarOutlined, ClockCircleOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import { Avatar, Button, Card, Descriptions, List, Progress, Space, Tag, Typography } from "antd";
import Link from "next/link";
import { sessions } from "@/lib/mock-data";

export function SessionDetail({ sessionId }: { sessionId: string }) {
  const session = sessions.find((item) => item.id === sessionId) ?? sessions[0];
  return (
    <div className="page-stack">
      <Link href="/sessions"><Button type="text" icon={<ArrowLeftOutlined />}>返回场次列表</Button></Link>
      <div className="page-grid">
        <Card className="surface-card span-8">
          <Space orientation="vertical" size={18} style={{ width: "100%" }}>
            <Space><Tag color="purple">{session.type}</Tag><Tag color="success">{session.status}</Tag></Space>
            <Typography.Title level={2} style={{ margin: 0 }}>{session.title}</Typography.Title>
            <Descriptions column={{ xs: 1, sm: 2 }} items={[
              { key: "time", label: "开场时间", children: <><CalendarOutlined /> {session.time}</> },
              { key: "duration", label: "预计时长", children: <><ClockCircleOutlined /> {session.duration}</> },
              { key: "dm", label: "带场 DM", children: <><UserOutlined /> {session.dm}</> },
              { key: "people", label: "当前人数", children: <><TeamOutlined /> {session.players}/{session.capacity}</> },
            ]} />
            <div><Typography.Text type="secondary">报名进度</Typography.Text><Progress percent={(session.players / session.capacity) * 100} strokeColor={session.color} /></div>
          </Space>
        </Card>
        <Card className="surface-card span-4" title="快捷操作">
          <Space orientation="vertical" style={{ width: "100%" }}><Button type="primary" block>手动新增预约</Button><Button block>编辑场次信息</Button><Button block>复制报名链接</Button></Space>
        </Card>
        <Card className="surface-card span-12" title={`已报名玩家（${session.players}）`}>
          <List dataSource={["林小野", "周予安", "Momo", "顾北", "夏川"].slice(0, session.players)} renderItem={(name, index) => <List.Item extra={<Tag color={index < 3 ? "success" : "processing"}>{index < 3 ? "已确认" : "待确认"}</Tag>}><List.Item.Meta avatar={<Avatar style={{ background: "#efedff", color: "#5d4be2" }}>{name.slice(0, 1)}</Avatar>} title={name} description={`预约码 TH${2031 + index}`} /></List.Item>} />
        </Card>
      </div>
    </div>
  );
}
