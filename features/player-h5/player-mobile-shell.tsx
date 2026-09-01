"use client";

import {
  CommentOutlined,
  HomeOutlined,
  ReadOutlined,
  TrophyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { usePathname } from "next/navigation";
import styles from "./player-mobile-shell.module.css";

const navItems = [
  { href: "/p", label: "首页", icon: HomeOutlined },
  { href: "/p/scripts", label: "剧本", icon: ReadOutlined },
  { href: "/p/sessions", label: "拼车", icon: TrophyOutlined },
  { href: "/p/ai", label: "AI 客服", icon: CommentOutlined },
  { href: "/p/me", label: "我的", icon: UserOutlined },
];

export function PlayerMobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <main className={styles.shell}>
      <div className={styles.viewport}>{children}</div>
      <nav className={styles.bottomNav} aria-label="玩家端底部导航">
        <div className={styles.bottomNavInner}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/p" ? pathname === "/p" : pathname.startsWith(item.href);
            return (
              <a
                className={`${styles.navItem} ${active ? styles.activeNavItem : ""}`}
                href={item.href}
                key={item.href}
              >
                <Icon />
                <span>{item.label}</span>
              </a>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
