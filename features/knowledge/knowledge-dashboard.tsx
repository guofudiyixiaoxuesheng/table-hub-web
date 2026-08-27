"use client";

import { CloudUploadOutlined, FilePdfOutlined, MoreOutlined } from "@ant-design/icons";
import { Button, Card, Progress, Space, Table, Tag, Typography, Upload } from "antd";
import { knowledgeFiles } from "@/lib/mock-data";

export function KnowledgeDashboard() {
  return (
    <div className="page-grid">
      <Card className="surface-card span-4">
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          <Typography.Text type="secondary">知识库状态</Typography.Text>
          <Typography.Title level={3} style={{ margin: 0 }}>104 个知识片段</Typography.Title>
          <Progress percent={82} strokeColor="#6d5dfc" />
          <Typography.Text type="secondary">3 个文档中有 2 个已完成向量化</Typography.Text>
        </Space>
      </Card>
      <Card className="surface-card span-8">
        <Upload.Dragger showUploadList={false} beforeUpload={() => false} accept=".pdf">
          <p><CloudUploadOutlined style={{ fontSize: 30, color: "#6d5dfc" }} /></p>
          <p style={{ marginBottom: 4 }}>拖入 PDF 或点击选择文件</p>
          <Typography.Text type="secondary">上传后将自动检测重复与新版本</Typography.Text>
        </Upload.Dragger>
      </Card>
      <Card className="surface-card span-12" title="知识文档">
        <Table
          rowKey="key"
          pagination={false}
          scroll={{ x: 720 }}
          dataSource={knowledgeFiles}
          columns={[
            { title: "文档", dataIndex: "name", render: (name) => <Space><FilePdfOutlined style={{ color: "#e15b64" }} />{name}</Space> },
            { title: "版本", dataIndex: "version", width: 90 },
            { title: "片段", dataIndex: "chunks", width: 90 },
            { title: "更新时间", dataIndex: "updatedAt", width: 130 },
            { title: "状态", dataIndex: "status", width: 100, render: (status) => <Tag color={status === "可用" ? "success" : "processing"}>{status}</Tag> },
            { title: "", width: 50, render: () => <Button type="text" icon={<MoreOutlined />} /> },
          ]}
        />
      </Card>
    </div>
  );
}
