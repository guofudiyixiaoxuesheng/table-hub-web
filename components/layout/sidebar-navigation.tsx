"use client";

import {
  BookOutlined,
  CalendarOutlined,
  CustomerServiceOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import { Menu } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { navigationItems, type NavigationItem } from "@/config/navigation";

const icons: Record<NavigationItem["icon"], React.ReactNode> = {
  chat: <CustomerServiceOutlined />,
  knowledge: <BookOutlined />,
  customers: <TeamOutlined />,
  players: <UsergroupAddOutlined />,
  sessions: <CalendarOutlined />,
};

export function SidebarNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const selected = navigationItems.find((item) => pathname.startsWith(item.href));

  return (
    <Menu
      mode="inline"
      theme="dark"
      selectedKeys={[selected?.href ?? "/chat"]}
      items={navigationItems.map((item) => ({
        key: item.href,
        icon: icons[item.icon],
        label: item.label,
      }))}
      onClick={({ key }) => {
        router.push(key);
        onNavigate?.();
      }}
    />
  );
}
