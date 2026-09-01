"use client";

import { BellOutlined, EyeOutlined, LoginOutlined, MenuOutlined } from "@ant-design/icons";
import { Avatar, Badge, Button, Dropdown, Space } from "antd";
import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";
import { ChangePasswordModal } from "@/features/auth/change-password-modal";
import styles from "./workspace-shell.module.css";

export function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, logout } = useAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const displayName = user?.nickname || "店长";
  const avatarText = displayName.slice(0, 1);

  return (
    <header className={styles.topBar}>
      <Button className={styles.mobileMenuButton} type="text" icon={<MenuOutlined />} onClick={onOpenMenu} aria-label="打开导航" />
      <div className={styles.topBarIntro}>
        <span>{user ? `欢迎回来，${user.storeName || displayName}` : "欢迎浏览 TableHub"}</span>
        <small>{user ? `${displayName} · ${user.role}` : "登录后可预约、保存记录并查看个人信息"}</small>
      </div>
      <Space size={16}>
        <Link href="/p" target="_blank">
          <Button icon={<EyeOutlined />}>玩家端预览</Button>
        </Link>
        {user ? (
          <>
            <Badge dot offset={[-3, 4]}>
              <Button type="text" shape="circle" icon={<BellOutlined />} />
            </Badge>
            <Dropdown menu={{ items: [{ key: "me", label: "我的信息" }, { key: "password", label: "修改密码" }, { key: "logout", label: "退出登录", danger: true }], onClick: ({ key }) => { if (key === "me") router.push("/me"); if (key === "password") setPasswordOpen(true); if (key === "logout") void logout(); } }}>
              <button className={styles.profileButton} type="button">
                <Avatar style={{ background: "#6d5dfc" }}>{avatarText}</Avatar>
                <span>{displayName}</span>
              </button>
            </Dropdown>
          </>
        ) : (
          <Button type="primary" icon={<LoginOutlined />} onClick={() => router.push(`/login?next=${encodeURIComponent(pathname)}`)}>登录</Button>
        )}
      </Space>
      {user && <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />}
    </header>
  );
}
