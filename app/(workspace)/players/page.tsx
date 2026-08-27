import type { Metadata } from "next";
import { PageHeading } from "@/components/shared/page-heading";
import { PlayerOverview } from "@/features/players/player-overview";

export const metadata: Metadata = { title: "玩家中心" };

export default function PlayersPage() {
  return (
    <div className="page-stack">
      <PageHeading title="玩家中心" description="洞察玩家活跃度、复玩情况和内容偏好" />
      <PlayerOverview />
    </div>
  );
}
