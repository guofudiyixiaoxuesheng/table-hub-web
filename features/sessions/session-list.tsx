"use client";

import { CalendarOutlined, ClockCircleOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Progress, Space, Tag, Typography } from "antd";
import Link from "next/link";
import { sessions } from "@/lib/mock-data";
import styles from "./sessions.module.css";

export function SessionList() {
  return (
    <div className={styles.grid}>
      {sessions.map((session) => (
        <Card key={session.id} className={`surface-card ${styles.card}`} styles={{ body: { padding: 0 } }}>
          <div className={styles.cover} style={{ background: `linear-gradient(145deg, ${session.color}, #171725)` }}>
            <Tag color={session.status === "已满员" ? "default" : "success"}>{session.status}</Tag>
            <span>{session.type}</span>
            <h3>{session.title}</h3>
          </div>
          <div className={styles.body}>
            <Space orientation="vertical" size={10} style={{ width: "100%" }}>
              <Typography.Text><CalendarOutlined /> {session.time}</Typography.Text>
              <Space separator={<span>·</span>}><span><ClockCircleOutlined /> {session.duration}</span><span><UserOutlined /> DM {session.dm}</span></Space>
              <div><Space style={{ width: "100%", justifyContent: "space-between" }}><span><TeamOutlined /> 报名进度</span><strong>{session.players}/{session.capacity}</strong></Space><Progress percent={(session.players / session.capacity) * 100} showInfo={false} strokeColor={session.color} /></div>
              <Link href={`/sessions/${session.id}`}><Button block>查看场次详情</Button></Link>
            </Space>
          </div>
        </Card>
      ))}
    </div>
  );
}
