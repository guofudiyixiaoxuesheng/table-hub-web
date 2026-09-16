import type { Metadata } from "next";
import { PageHeading } from "@/components/shared/page-heading";
import { ScriptMarketingDashboard } from "@/features/script-marketing/script-marketing-dashboard";

export const metadata: Metadata = { title: "AI 运营物料" };

export default function KnowledgeMarketingPage() {
  return (
    <div className="page-stack">
      <PageHeading
        title="知识库 / 运营物料"
        description="生成运营文案、确认正式版本、生成主图，并复用到剧本场次"
      />
      <ScriptMarketingDashboard />
    </div>
  );
}
