import type { AppRole } from "@/lib/auth/types";
import { hasFullAccess } from "./access";

export type NavigationItem = {
  href: string;
  label: string;
  icon: "chat" | "knowledge" | "users" | "customers" | "players" | "sessions" | "me";
  management?: boolean;
  children?: NavigationItem[];
};

export const navigationItems: NavigationItem[] = [
  { href: "/chat", label: "AI 对话", icon: "chat" },
  { href: "/knowledge", label: "知识库", icon: "knowledge", management: true },
  {
    href: "/users",
    label: "用户中心",
    icon: "users",
    management: true,
    children: [
      { href: "/users/players", label: "客户池", icon: "players", management: true },
      { href: "/users/staff", label: "员工/DM", icon: "customers", management: true },
      { href: "/users/guests", label: "游客线索", icon: "customers", management: true },
      { href: "/users/analytics", label: "用户分析", icon: "customers", management: true },
    ],
  },
  { href: "/sessions", label: "剧本场次", icon: "sessions" },
  { href: "/me", label: "我的", icon: "me" },
];

export function getNavigationItems(role: AppRole): NavigationItem[] {
  return navigationItems
    .filter((item) => !item.management || hasFullAccess(role))
    .map((item) => ({
      ...item,
      children: item.children?.filter((child) => !child.management || hasFullAccess(role)),
    }));
}
