import type { AppRole } from "@/lib/auth/types";
import { hasFullAccess } from "./access";

export type NavigationItem = {
  href: string;
  label: string;
  icon: "chat" | "knowledge" | "customers" | "players" | "sessions" | "me";
  management?: boolean;
};

export const navigationItems: NavigationItem[] = [
  { href: "/chat", label: "AI 对话", icon: "chat" },
  { href: "/knowledge", label: "知识库", icon: "knowledge", management: true },
  { href: "/customers", label: "客户管理", icon: "customers", management: true },
  { href: "/players", label: "玩家中心", icon: "players", management: true },
  { href: "/sessions", label: "剧本场次", icon: "sessions" },
  { href: "/me", label: "我的", icon: "me" },
];

export function getNavigationItems(role: AppRole): NavigationItem[] {
  return navigationItems.filter((item) => !item.management || hasFullAccess(role));
}
