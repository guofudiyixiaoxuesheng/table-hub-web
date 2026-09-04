"use client";

import { Button, Card, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";
import { MyProfile } from "@/features/auth/my-profile";

export function PlayerProfileEntry() {
  const router = useRouter();
  const { user } = useAuth();

  if (user) return <MyProfile />;

  return (
    <Card className="surface-card">
      <Typography.Title level={3} style={{ marginTop: 0 }}>登录后查看我的预约</Typography.Title>
      <Typography.Paragraph type="secondary">
        登录后可以预约拼车、查看预约码、取消约车，也能同步查看自己的玩本记录。
      </Typography.Paragraph>
      <Button type="primary" size="large" block onClick={() => router.push("/login?next=/p/me")}>
        手机号登录 / 注册
      </Button>
    </Card>
  );
}
