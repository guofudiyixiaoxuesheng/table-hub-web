export type NavigationItem = {
  href: string;
  label: string;
  icon: "chat" | "knowledge" | "customers" | "players" | "sessions";
};

export const navigationItems: NavigationItem[] = [
  { href: "/chat", label: "AI 对话", icon: "chat" },
  { href: "/knowledge", label: "知识库", icon: "knowledge" },
  { href: "/customers", label: "客户管理", icon: "customers" },
  { href: "/players", label: "玩家中心", icon: "players" },
  { href: "/sessions", label: "剧本场次", icon: "sessions" },
];
