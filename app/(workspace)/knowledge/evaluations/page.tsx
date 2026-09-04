import type { Metadata } from "next";
import { PageHeading } from "@/components/shared/page-heading";
import { KnowledgeEvaluationDashboard } from "@/features/knowledge/knowledge-evaluation-dashboard";

export const metadata: Metadata = { title: "知识库效果评估" };

export default function KnowledgeEvaluationsPage() {
  return (
    <div className="page-stack">
      <PageHeading title="知识库 / 效果评估" description="检测 AI 剧本问答质量、资料命中情况和潜在剧透风险" />
      <KnowledgeEvaluationDashboard />
    </div>
  );
}
