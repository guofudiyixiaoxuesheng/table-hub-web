import type { Metadata } from "next";
import { PageHeading } from "@/components/shared/page-heading";
import { ScriptOpeningManualDashboard } from "@/features/script-opening-manual/script-opening-manual-dashboard";

export const metadata: Metadata = { title: "DM 主持手册" };

export default function KnowledgeManualsPage() {
  return (
    <div className="page-stack">
      <PageHeading
        title="知识库 / DM 主持手册"
        description="把剧本资料整理成 DM 可执行的开本时间线、控场流程、话术和风险提醒"
      />
      <ScriptOpeningManualDashboard />
    </div>
  );
}
