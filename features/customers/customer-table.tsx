"use client";

import { SearchOutlined, UserAddOutlined } from "@ant-design/icons";
import { Avatar, Button, Card, Input, Space, Table, Tag } from "antd";
import { customers } from "@/lib/mock-data";

export function CustomerTable() {
  return (
    <Card className="surface-card" title="客户列表" extra={<Button type="primary" icon={<UserAddOutlined />}>新增客户</Button>}>
      <Input prefix={<SearchOutlined />} placeholder="搜索昵称或手机号" style={{ maxWidth: 320, marginBottom: 18 }} allowClear />
      <Table
        rowKey="key"
        dataSource={customers}
        scroll={{ x: 720 }}
        pagination={false}
        columns={[
          { title: "客户", dataIndex: "name", render: (name) => <Space><Avatar style={{ background: "#efedff", color: "#5d4be2" }}>{name.slice(0, 1)}</Avatar><strong>{name}</strong></Space> },
          { title: "手机号", dataIndex: "phone" },
          { title: "到店次数", dataIndex: "visits", render: (value) => `${value} 次` },
          { title: "偏好", dataIndex: "preference", render: (value) => <Tag>{value}</Tag> },
          { title: "状态", dataIndex: "status", render: (value) => <Tag color={value === "活跃" ? "success" : "default"}>{value}</Tag> },
          { title: "操作", render: () => <Button type="link">查看详情</Button> },
        ]}
      />
    </Card>
  );
}
