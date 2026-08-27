import type { Metadata } from "next";
import { PageHeading } from "@/components/shared/page-heading";
import { CustomerTable } from "@/features/customers/customer-table";

export const metadata: Metadata = { title: "客户管理" };

export default function CustomersPage() {
  return (
    <div className="page-stack">
      <PageHeading title="客户管理" description="统一查看客户资料、到店记录和玩家偏好" />
      <CustomerTable />
    </div>
  );
}
