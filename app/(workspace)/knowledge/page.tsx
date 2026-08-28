import type { Metadata } from "next";
import { PageActionButton } from "@/components/shared/page-action-button";
import { PageHeading } from "@/components/shared/page-heading";
import { KnowledgeDashboard } from "@/features/knowledge/knowledge-dashboard";

export const metadata: Metadata = { title: "知识库" };

export default function KnowledgePage() {
  return (
    <div className="page-stack">
      <PageHeading title="知识库" description="统一管理剧本、门店规则、FAQ、活动资料及其他文档" action={<PageActionButton icon="upload" label="上传知识资源" href="/knowledge/upload" />} />
      <KnowledgeDashboard />
    </div>
  );
}
