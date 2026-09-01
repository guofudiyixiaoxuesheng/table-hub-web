import type { Metadata } from "next";
import { PageHeading } from "@/components/shared/page-heading";
import { UserCenterPlaceholder } from "@/features/users/user-center-placeholder";

export const metadata: Metadata = { title: "游客线索" };

export default function UserGuestsPage() {
  return (
    <div className="page-stack">
      <PageHeading title="用户中心 / 游客线索" description="沉淀 H5 浏览访客、AI 咨询行为和登录转化线索" />
      <UserCenterPlaceholder type="guests" />
    </div>
  );
}
