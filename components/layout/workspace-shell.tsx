"use client";

import { useEffect, useState } from "react";
import { Drawer, Layout, Spin } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { canAccessPath, isPublicPath } from "@/config/access";
import { useAuth } from "@/features/auth/auth-provider";
import { Brand } from "./brand";
import { SidebarNavigation } from "./sidebar-navigation";
import { TopBar } from "./top-bar";
import styles from "./workspace-shell.module.css";

const { Sider, Content } = Layout;

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { loading, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const allowed = user ? canAccessPath(user.role, pathname) : isPublicPath(pathname);

  useEffect(() => {
    if (!loading && user && !allowed) router.replace("/chat");
  }, [allowed, loading, router, user]);

  if ((loading && !isPublicPath(pathname)) || !allowed) {
    return <div className={styles.authLoading}><Spin size="large" tip="正在验证登录状态" /></div>;
  }

  return (
    <Layout className={styles.shell}>
      <Sider className={styles.desktopSidebar} width={236} trigger={null}>
        <Brand />
        <SidebarNavigation />
        <div className={styles.sidebarHint}><span>AI 服务状态</span><strong>运行正常</strong></div>
      </Sider>
      <Drawer className={styles.mobileDrawer} placement="left" size={260} open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} styles={{ body: { padding: 0, background: "#151525" } }} closeIcon={false}>
        <Brand />
        <SidebarNavigation onNavigate={() => setMobileMenuOpen(false)} />
      </Drawer>
      <Layout className={styles.mainLayout}>
        <TopBar onOpenMenu={() => setMobileMenuOpen(true)} />
        <Content className={styles.content}>{children}</Content>
      </Layout>
    </Layout>
  );
}
