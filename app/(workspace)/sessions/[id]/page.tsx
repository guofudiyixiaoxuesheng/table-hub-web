import type { Metadata } from "next";
import { SessionDetail } from "@/features/sessions/session-detail";

export const metadata: Metadata = { title: "场次详情" };

export default async function SessionDetailPage({ params }: PageProps<"/sessions/[id]">) {
  const { id } = await params;
  return <SessionDetail sessionId={id} />;
}
