"use client";

import { PlusOutlined, UploadOutlined } from "@ant-design/icons";
import { Button } from "antd";

const icons = {
  plus: <PlusOutlined />,
  upload: <UploadOutlined />,
};

export function PageActionButton({ label, icon, href }: { label: string; icon: keyof typeof icons; href?: string }) {
  return <Button type="primary" icon={icons[icon]} href={href}>{label}</Button>;
}
