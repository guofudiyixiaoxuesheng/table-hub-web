import type { Metadata } from "next";
import { PageHeading } from "@/components/shared/page-heading";
import { ScriptMarketingDashboard } from "@/features/script-marketing/script-marketing-dashboard";

export const metadata: Metadata = { title: "AI 运营物料" };

export default function KnowledgeMarketingPage() {
  return (
    <div className="page-stack">
      <PageHeading
        title="知识库 / AI 运营物料"
        description="把剧本资料转成朋友圈宣传文案、宣传图方案和创建场次时可复用的表单内容"
      />
      <ScriptMarketingDashboard />
    </div>
  );
}
