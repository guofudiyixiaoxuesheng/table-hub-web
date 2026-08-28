"use client";

import { ThunderboltFilled } from "@ant-design/icons";
import { Tabs, Typography } from "antd";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";
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
          <p className={styles.eyebrow}>TABLEHUB · STORE OS</p>
          <h1>让每一次咨询，<br />都自然走向到店。</h1>
          <p>AI 承接重复问答，场次、预约和客户统一管理。把时间留给真正重要的体验。</p>
          <div className={styles.signal}><i /><span>AI 客服与门店系统运行正常</span></div>
        </div>
      </section>
      <section className={styles.formSide}>
        <div className={styles.mobileBrand}><span><ThunderboltFilled /></span>TableHub</div>
        <div className={styles.formCard}>
          <Typography.Title level={2}>TableHub 账户</Typography.Title>
          <Typography.Paragraph type="secondary">登录已有门店，或创建你的第一个门店账户。</Typography.Paragraph>
          <Tabs
            defaultActiveKey="login"
            items={[
              { key: "login", label: "登录", children: <LoginForm onSuccess={() => router.replace(nextPath)} /> },
              { key: "register", label: "注册", children: <RegisterForm onSuccess={() => router.replace(nextPath)} /> },
            ]}
          />
          <p className={styles.help}>普通用户可直接注册；店长创建门店；DM 使用店长邀请码加入</p>
        </div>
      </section>
    </main>
  );
}
