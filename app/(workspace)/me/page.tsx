import type { Metadata } from "next";
import { PageHeading } from "@/components/shared/page-heading";
import { MyProfile } from "@/features/auth/my-profile";

export const metadata: Metadata = { title: "我的" };

export default function MyPage() {
  return (
    <div className="page-stack">
      <PageHeading title="我的" description="查看当前账号、门店身份和安全设置" />
      <MyProfile />
    </div>
  );
}
