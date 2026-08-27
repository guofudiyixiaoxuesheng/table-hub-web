"use client";

import { Space, Typography } from "antd";

type PageHeadingProps = { title: string; description: string; action?: React.ReactNode };

export function PageHeading({ title, description, action }: PageHeadingProps) {
  return (
    <div className="page-heading">
      <Space orientation="vertical" size={2}>
        <Typography.Title level={2} style={{ margin: 0, fontSize: 25 }}>{title}</Typography.Title>
        <Typography.Text type="secondary">{description}</Typography.Text>
      </Space>
      {action}
    </div>
  );
}
