import type { Metadata } from "next";
import { PageHeading } from "@/components/shared/page-heading";
import { ScriptMarketingDetail } from "@/features/script-marketing/script-marketing-detail";

export const metadata: Metadata = { title: "运营物料详情" };

type ScriptMarketingDetailPageProps = {
  params: Promise<{ documentId: string }>;
};

export default async function ScriptMarketingDetailPage({ params }: ScriptMarketingDetailPageProps) {
  const { documentId } = await params;

  return (
    <div className="page-stack">
      <PageHeading
        title="AI 运营物料详情"
        description="管理单个剧本的拼车卡片、详情页内容、朋友圈文案和宣传图片方案"
      />
      <ScriptMarketingDetail documentId={documentId} />
    </div>
  );
}
