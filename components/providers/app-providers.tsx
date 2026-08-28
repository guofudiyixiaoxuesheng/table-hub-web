"use client";

import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { AuthProvider } from "@/features/auth/auth-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: "#6d5dfc",
          borderRadius: 12,
          colorText: "#161722",
          colorTextSecondary: "#74788d",
          fontFamily: "var(--font-geist-sans), PingFang SC, sans-serif",
        },
        components: {
          Button: { controlHeight: 40 },
          Input: { controlHeight: 42 },
          Card: { paddingLG: 22 },
          Table: { headerBg: "#fafafe" },
        },
      }}
    >
      <AuthProvider>{children}</AuthProvider>
    </ConfigProvider>
  );
}
