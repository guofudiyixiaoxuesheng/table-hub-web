import type { Metadata } from "next";
import { PageHeading } from "@/components/shared/page-heading";
import { SessionList } from "@/features/sessions/session-list";

export const metadata: Metadata = { title: "剧本场次" };

export default function SessionsPage() {
  return (
    <div className="page-stack">
      <PageHeading title="剧本场次" description="浏览近期剧本活动、报名进度和带场安排" />
      <SessionList />
    </div>
  );
}
