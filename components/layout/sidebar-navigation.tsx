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
import { usePathname, useRouter } from "next/navigation";
import { getNavigationItems, type NavigationItem } from "@/config/navigation";
import { useAuth } from "@/features/auth/auth-provider";

const icons: Record<NavigationItem["icon"], React.ReactNode> = {
  chat: <CustomerServiceOutlined />,
  knowledge: <BookOutlined />,
  customers: <TeamOutlined />,
  players: <UsergroupAddOutlined />,
  sessions: <CalendarOutlined />,
  me: <UserOutlined />,
};

export function SidebarNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const items = getNavigationItems(user?.role ?? "guest");
  const selected = items.find((item) => pathname.startsWith(item.href));

  return (
    <Menu
      mode="inline"
      theme="dark"
      selectedKeys={[selected?.href ?? "/chat"]}
      items={items.map((item) => ({
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
