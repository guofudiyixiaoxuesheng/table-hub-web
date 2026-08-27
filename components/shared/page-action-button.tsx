"use client";

import { PlusOutlined, UploadOutlined } from "@ant-design/icons";
import { Button } from "antd";

const icons = {
  plus: <PlusOutlined />,
  upload: <UploadOutlined />,
};

export function PageActionButton({ label, icon }: { label: string; icon: keyof typeof icons }) {
  return <Button type="primary" icon={icons[icon]}>{label}</Button>;
}
