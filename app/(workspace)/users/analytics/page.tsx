import type { Metadata } from "next";
import { PageHeading } from "@/components/shared/page-heading";
import { UserAnalyticsDashboard } from "@/features/users/user-analytics-dashboard";

export const metadata: Metadata = { title: "用户分析" };

export default function UserAnalyticsPage() {
  return (
    <div className="page-stack">
      <PageHeading title="用户中心 / 用户分析" description="分析玩家偏好、预约转化、复玩情况和用户来源" />
      <UserAnalyticsDashboard />
    </div>
  );
}
