import type { Metadata } from "next";
import { PageActionButton } from "@/components/shared/page-action-button";
import { PageHeading } from "@/components/shared/page-heading";
import { KnowledgeDashboard } from "@/features/knowledge/knowledge-dashboard";

export const metadata: Metadata = { title: "知识库" };

export default function KnowledgePage() {
  return (
    <div className="page-stack">
      <PageHeading title="知识库" description="管理 AI 客服使用的门店资料、版本和向量状态" action={<PageActionButton icon="upload" label="上传文档" />} />
      <KnowledgeDashboard />
    </div>
  );
}
