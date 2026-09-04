"use client";

import { ThunderboltFilled } from "@ant-design/icons";
import { Tabs, Typography } from "antd";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";
import { LoginForm } from "./login-form";
import { SmsLoginForm } from "./sms-login-form";
import styles from "./login-panel.module.css";

export function LoginPanel() {
  const { loading, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPath = searchParams.get("next");
  const nextPath = requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
    ? requestedPath
    : "/chat";

  useEffect(() => {
    if (!loading && user) router.replace(nextPath);
  }, [loading, nextPath, router, user]);

  return (
    <main className={styles.page}>
      <section className={styles.story}>
        <div className={styles.storyContent}>
          <span className={styles.logo}><ThunderboltFilled /></span>
          <p className={styles.eyebrow}>TABLEHUB · PLAYER PASS</p>
          <h1>登录后即可预约，<br />继续你的组局。</h1>
          <p>用手机号进入，查看可拼场次、预约记录和 AI 咨询内容。</p>
          <div className={styles.signal}><i /><span>玩家登录入口已就绪</span></div>
        </div>
      </section>
      <section className={styles.formSide}>
        <div className={styles.mobileBrand}><span><ThunderboltFilled /></span>TableHub</div>
        <div className={styles.formCard}>
          <Typography.Title level={2}>TableHub 账户</Typography.Title>
          <Typography.Paragraph type="secondary">玩家可用验证码快速登录；已有账号也可以使用手机号密码登录。</Typography.Paragraph>
          <Tabs
            defaultActiveKey="sms"
            items={[
              { key: "sms", label: "验证码登录", children: <SmsLoginForm /> },
              { key: "login", label: "密码登录", children: <LoginForm onSuccess={() => router.replace(nextPath)} /> },
            ]}
          />
          <p className={styles.help}>门店注册与 DM 邀请入口已暂时隐藏，后续建议放到后台单独管理。</p>
        </div>
      </section>
    </main>
  );
}
