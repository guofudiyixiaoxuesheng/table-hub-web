"use client";

import { LogoutOutlined, LockOutlined, ShopOutlined, UserOutlined } from "@ant-design/icons";
import { Avatar, Button, Card, Descriptions, Space, Tag, Typography } from "antd";
import { useState } from "react";
import type { AppRole } from "@/lib/auth/types";
import { ChangePasswordModal } from "./change-password-modal";
import { DmInviteCard } from "./dm-invite-card";
import { useAuth } from "./auth-provider";
import { MyReservations } from "./my-reservations";

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "超级管理员",
  manager: "店长",
  dm: "DM",
  user: "普通用户",
  guest: "浏览用户",
};

export function MyProfile() {
  const { user, logout } = useAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);
  if (!user) return null;

  const displayName = user.nickname || "未设置昵称";
  return (
    <div className="page-grid">
      <Card className="surface-card span-4">
        <Space orientation="vertical" align="center" size={14} style={{ width: "100%" }}>
          <Avatar size={88} src={user.avatarUrl} icon={<UserOutlined />} style={{ background: "#6d5dfc" }} />
          <div style={{ textAlign: "center" }}>
            <Typography.Title level={3} style={{ margin: 0 }}>{displayName}</Typography.Title>
            <Tag color={user.role === "admin" || user.role === "manager" ? "purple" : "blue"}>{ROLE_LABELS[user.role]}</Tag>
          </div>
          <Button icon={<LockOutlined />} onClick={() => setPasswordOpen(true)}>修改密码</Button>
          <Button icon={<LogoutOutlined />} onClick={() => void logout()} className="danger-soft-button">退出登录</Button>
        </Space>
      </Card>
      <Card className="surface-card span-8" title="个人信息">
        <Descriptions column={1} bordered>
          <Descriptions.Item label="手机号">{user.phone}</Descriptions.Item>
          <Descriptions.Item label="用户 ID">{user.id}</Descriptions.Item>
          <Descriptions.Item label="角色">{ROLE_LABELS[user.role]}（{user.role}）</Descriptions.Item>
          <Descriptions.Item label="所属门店">{user.storeName ? <Space><ShopOutlined />{user.storeName}</Space> : "暂无门店"}</Descriptions.Item>
          <Descriptions.Item label="门店 ID">{user.storeId || "—"}</Descriptions.Item>
        </Descriptions>
      </Card>
      <div className="span-12">
        <MyReservations />
      </div>
      {(user.role === "manager" || user.role === "admin") && user.storeId && <DmInviteCard />}
      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}
