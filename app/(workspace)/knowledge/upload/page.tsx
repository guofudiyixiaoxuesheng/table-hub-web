import type { Metadata } from "next";
import { PageHeading } from "@/components/shared/page-heading";
import { KnowledgeResourceUpload } from "@/features/knowledge/knowledge-resource-upload";

export const metadata: Metadata = { title: "上传知识库资源" };

type UploadPageSearchParams = {
  documentId?: string;
  resourceType?: string;
  name?: string;
  scriptGenre?: string;
  description?: string;
  tags?: string;
  currentVersion?: string;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function UploadKnowledgeResourcePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const draft: UploadPageSearchParams = {
    documentId: firstValue(params.documentId),
    resourceType: firstValue(params.resourceType),
    name: firstValue(params.name),
    scriptGenre: firstValue(params.scriptGenre),
    description: firstValue(params.description),
    tags: firstValue(params.tags),
    currentVersion: firstValue(params.currentVersion),
  };
  const isNewVersion = Boolean(draft.documentId);
  return (
    <div className="page-stack">
      <PageHeading
        title={isNewVersion ? "上传新版本" : "上传知识库资源"}
        description={isNewVersion ? "重新上传完整文件夹，新版本会替换当前 AI 使用版本，旧版本保留用于回溯" : "剧本支持整文件夹上传，其他资料支持多文件上传，并统一进入版本与 RAG 管理"}
      />
      <KnowledgeResourceUpload initialDraft={draft} />
    </div>
  );
}
