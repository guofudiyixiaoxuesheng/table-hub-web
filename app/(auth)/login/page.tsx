import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginPanel } from "@/features/auth/login-panel";

export const metadata: Metadata = { title: "登录" };

export default function LoginPage() {
  return <Suspense fallback={null}><LoginPanel /></Suspense>;
}
