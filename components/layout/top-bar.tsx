"use client";

import { BellOutlined, MenuOutlined } from "@ant-design/icons";
import { Avatar, Badge, Button, Dropdown, Space } from "antd";
import styles from "./workspace-shell.module.css";

export function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header className={styles.topBar}>
      <Button className={styles.mobileMenuButton} type="text" icon={<MenuOutlined />} onClick={onOpenMenu} aria-label="打开导航" />
      <div className={styles.topBarIntro}>
        <span>晚上好，北岸桌游店</span>
        <small>今天有 4 场活动等待确认</small>
      </div>
      <Space size={16}>
        <Badge dot offset={[-3, 4]}>
          <Button type="text" shape="circle" icon={<BellOutlined />} />
        </Badge>
        <Dropdown menu={{ items: [{ key: "profile", label: "账号设置" }, { key: "logout", label: "退出登录", danger: true }] }}>
          <button className={styles.profileButton} type="button">
            <Avatar style={{ background: "#6d5dfc" }}>北</Avatar>
            <span>店长</span>
          </button>
        </Dropdown>
      </Space>
    </header>
  );
}
