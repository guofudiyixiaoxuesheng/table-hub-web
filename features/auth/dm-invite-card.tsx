"use client";

import { CopyOutlined, TeamOutlined } from "@ant-design/icons";
import { Button, Card, Input, Space, Typography, message } from "antd";
import { useState } from "react";
import { apiFetch } from "@/lib/api/client";

type Invite = { code: string; expiresAt: string };

export function DmInviteCard() {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [creating, setCreating] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const createInvite = async () => {
    try {
      setCreating(true);
      setInvite(await apiFetch<Invite>("/api/v1/auth/dm-invites", { method: "POST" }));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "邀请码生成失败");
    } finally {
      setCreating(false);
    }
  };

  const copy = async () => {
    if (!invite) return;
    await navigator.clipboard.writeText(invite.code);
    messageApi.success("邀请码已复制");
  };

  return (
    <Card className="surface-card span-12" title={<Space><TeamOutlined />邀请 DM 加入门店</Space>}>
      {contextHolder}
      <Typography.Paragraph type="secondary">邀请码 7 天内有效，只能使用一次。DM 在注册页面选择“DM”并填写该邀请码。</Typography.Paragraph>
      {invite ? (
        <Space wrap>
          <Input value={invite.code} readOnly style={{ width: 220 }} />
          <Button icon={<CopyOutlined />} onClick={copy}>复制邀请码</Button>
          <Typography.Text type="secondary">有效期至 {new Date(invite.expiresAt).toLocaleString("zh-CN")}</Typography.Text>
          <Button onClick={createInvite} loading={creating}>重新生成</Button>
        </Space>
      ) : (
        <Button type="primary" onClick={createInvite} loading={creating}>生成一次性 DM 邀请码</Button>
      )}
    </Card>
  );
}
