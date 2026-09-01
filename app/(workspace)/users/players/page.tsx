import type { Metadata } from "next";
import { PageHeading } from "@/components/shared/page-heading";
import { PlayerOverview } from "@/features/players/player-overview";

export const metadata: Metadata = { title: "客户池" };

export default function UserPlayersPage() {
  return (
    <div className="page-stack">
      <PageHeading title="用户中心 / 客户池" description="管理当前门店沉淀下来的玩家客户，可用于手动约车和后续用户分析" />
      <PlayerOverview />
    </div>
  );
}
