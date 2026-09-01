import type { AppRole } from "@/lib/auth/types";

const FULL_ACCESS_ROLES = new Set<AppRole>(["admin", "manager"]);
const BASIC_ROUTE_PREFIXES = ["/chat", "/sessions", "/me"];
const PUBLIC_ROUTE_PREFIXES = ["/chat", "/sessions", "/p"];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function hasFullAccess(role: AppRole): boolean {
  return FULL_ACCESS_ROLES.has(role);
}

export function canAccessPath(role: AppRole, pathname: string): boolean {
  if (hasFullAccess(role)) return true;
  return BASIC_ROUTE_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_ROUTE_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}
