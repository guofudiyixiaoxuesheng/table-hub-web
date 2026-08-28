import type { Metadata } from "next";
import { PageHeading } from "@/components/shared/page-heading";
import { KnowledgeResourceUpload } from "@/features/knowledge/knowledge-resource-upload";

export const metadata: Metadata = { title: "上传知识库资源" };

export default function UploadKnowledgeResourcePage() {
  return (
    <div className="page-stack">
      <PageHeading title="上传知识库资源" description="剧本支持整文件夹上传，其他资料支持多文件上传，并统一进入版本与 RAG 管理" />
      <KnowledgeResourceUpload />
    </div>
  );
}
