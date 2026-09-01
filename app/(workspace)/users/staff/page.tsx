import type { Metadata } from "next";
import { PageHeading } from "@/components/shared/page-heading";
import { UserCenterPlaceholder } from "@/features/users/user-center-placeholder";

export const metadata: Metadata = { title: "员工/DM" };

export default function UserStaffPage() {
  return (
    <div className="page-stack">
      <PageHeading title="用户中心 / 员工/DM" description="统一管理门店工作人员、DM、店长和管理员" />
      <UserCenterPlaceholder type="staff" />
    </div>
  );
}
