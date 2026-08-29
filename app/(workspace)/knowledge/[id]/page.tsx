import type { Metadata } from "next";
import { PageHeading } from "@/components/shared/page-heading";
import { KnowledgeResourceDetail } from "@/features/knowledge/knowledge-resource-detail";

export const metadata: Metadata = { title: "知识库详情" };

type KnowledgeResourceDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function KnowledgeResourceDetailPage({ params }: KnowledgeResourceDetailPageProps) {
  const { id } = await params;

  return (
    <div className="page-stack">
      <PageHeading title="知识库详情" description="查看资源版本、原始文件与后续 RAG 处理状态" />
      <KnowledgeResourceDetail documentId={id} />
    </div>
  );
}
