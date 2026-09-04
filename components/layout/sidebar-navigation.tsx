"use client";

import {
  BookOutlined,
  CalendarOutlined,
  CustomerServiceOutlined,
  TeamOutlined,
  UserOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import { Menu } from "antd";
import type { MenuProps } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { getNavigationItems, type NavigationItem } from "@/config/navigation";
import { useAuth } from "@/features/auth/auth-provider";

const icons: Record<NavigationItem["icon"], React.ReactNode> = {
  chat: <CustomerServiceOutlined />,
  knowledge: <BookOutlined />,
  users: <TeamOutlined />,
  customers: <TeamOutlined />,
  players: <UsergroupAddOutlined />,
  sessions: <CalendarOutlined />,
  me: <UserOutlined />,
};

function flattenItems(items: NavigationItem[]): NavigationItem[] {
  return items.flatMap((item) => [item, ...(item.children ? flattenItems(item.children) : [])]);
}

type MenuItem = Required<MenuProps>["items"][number];

function toMenuItem(item: NavigationItem): MenuItem {
  return {
    key: item.key ?? item.href,
    icon: icons[item.icon],
    label: item.label,
    children: item.children?.map(toMenuItem),
  };
}

export function SidebarNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const items = getNavigationItems(user?.role ?? "guest");
  const flatItems = flattenItems(items);
  const selected = [...flatItems].sort((a, b) => b.href.length - a.href.length).find((item) => pathname.startsWith(item.href));
  const openKeys = items.filter((item) => item.children?.some((child) => pathname.startsWith(child.href))).map((item) => item.key ?? item.href);

  return (
    <Menu
      mode="inline"
      theme="dark"
      selectedKeys={[selected ? selected.key ?? selected.href : "/chat"]}
      defaultOpenKeys={openKeys}
      items={items.map(toMenuItem)}
      onClick={({ key }) => {
        const target = flatItems.find((item) => (item.key ?? item.href) === key);
        router.push(target?.href ?? key);
        onNavigate?.();
      }}
    />
  );
}
