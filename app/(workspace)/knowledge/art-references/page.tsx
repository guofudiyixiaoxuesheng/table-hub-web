import type { Metadata } from "next";
import { PageHeading } from "@/components/shared/page-heading";
import { ScriptArtReferenceDashboard } from "@/features/script-art-reference/script-art-reference-dashboard";

export const metadata: Metadata = { title: "视觉规律参考库" };

export default function ArtReferencesPage() {
  return (
    <div className="page-stack">
      <PageHeading
        title="知识库 / 视觉规律参考库"
        description="沉淀剧本发行图并提炼构图、色彩与材质规律；在生成运营物料主图时可选用，不单独产出运营图片"
      />
      <ScriptArtReferenceDashboard />
    </div>
  );
}
