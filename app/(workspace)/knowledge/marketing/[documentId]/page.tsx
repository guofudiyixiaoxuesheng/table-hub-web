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
        title="运营物料详情"
        description="在同一条流程中确认文案版本、生成主图并复用到场次"
      />
      <ScriptMarketingDetail documentId={documentId} />
    </div>
  );
}
