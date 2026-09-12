import type { Metadata } from "next";
import { PageHeading } from "@/components/shared/page-heading";
import { ScriptArtReferenceDashboard } from "@/features/script-art-reference/script-art-reference-dashboard";

export const metadata: Metadata = { title: "美术素材库" };

export default function ArtReferencesPage() {
  return (
    <div className="page-stack">
      <PageHeading
        title="知识库 / 美术素材库"
        description="沉淀剧本发行图、主图、详情图和人物图，用于后续提取美术规律、优化 AI 生图提示词"
      />
      <ScriptArtReferenceDashboard />
    </div>
  );
}
