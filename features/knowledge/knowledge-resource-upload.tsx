"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeftOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  FileOutlined,
  FolderOpenOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Button, Card, Col, Form, Input, Progress, Row, Select, Space, Statistic, Table, Tag, Typography, Upload, message } from "antd";
import type { UploadFile } from "antd";
import { downloadManifest, getRelativePath, toManifestFile, toManifestPreview, type BrowserFolderFile } from "@/lib/oss/knowledge-resource-manifest";
import { completeKnowledgeUpload, retryFailedKnowledgeUploads, uploadKnowledgeResourceDraft } from "@/lib/oss/knowledge-resource-api";
import {
  KNOWLEDGE_RESOURCE_OPTIONS,
  SCRIPT_GENRE_OPTIONS,
  type CreateKnowledgeResourcePayload,
  type KnowledgeUploadDraft,
  type KnowledgeResourceType,
  type ScriptGenre,
} from "@/lib/oss/knowledge-resource-types";
import styles from "./knowledge-resource-upload.module.css";

type FormValues = {
  resourceType: KnowledgeResourceType;
  scriptGenre?: ScriptGenre;
  name: string;
  version: string;
  description?: string;
  tags?: string[];
};

const MAX_FILES = 500;
const MAX_TOTAL_SIZE = 2 * 1024 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function getSourceFiles(files: UploadFile[]): BrowserFolderFile[] {
  return files.flatMap((file) => file.originFileObj ? [file.originFileObj as BrowserFolderFile] : []);
}

export function KnowledgeResourceUpload() {
  const [form] = Form.useForm<FormValues>();
  const resourceType = Form.useWatch("resourceType", form) ?? "script";
  const isScript = resourceType === "script";
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [uploadDraft, setUploadDraft] = useState<KnowledgeUploadDraft | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("准备上传");
  const [messageApi, contextHolder] = message.useMessage();
  const sourceFiles = useMemo(() => getSourceFiles(fileList), [fileList]);
  const totalSize = useMemo(() => sourceFiles.reduce((sum, file) => sum + file.size, 0), [sourceFiles]);
  const rootFolder = sourceFiles[0] ? getRelativePath(sourceFiles[0]).split("/")[0] : "尚未选择";

  const buildPayload = async (values: FormValues): Promise<CreateKnowledgeResourcePayload> => ({
    resourceType: values.resourceType,
    name: values.name,
    version: values.version,
    description: values.description,
    scriptGenre: values.resourceType === "script" ? values.scriptGenre : undefined,
    tags: values.tags ?? [],
    files: await Promise.all(sourceFiles.map(toManifestFile)),
  });

  const buildUploadPayload = (values: FormValues): Omit<CreateKnowledgeResourcePayload, "files"> => ({
    resourceType: values.resourceType,
    name: values.name,
    version: values.version,
    description: values.description,
    scriptGenre: values.resourceType === "script" ? values.scriptGenre : undefined,
    tags: values.tags ?? [],
  });

  const validateFolder = () => {
    if (!sourceFiles.length) throw new Error(isScript ? "请选择完整的剧本文件夹" : "请选择知识库文件");
    if (sourceFiles.length > MAX_FILES) throw new Error(`单次最多上传 ${MAX_FILES} 个文件`);
    if (totalSize > MAX_TOTAL_SIZE) throw new Error("文件夹总大小不能超过 2 GB");
  };

  const exportCurrentManifest = async () => {
    try {
      validateFolder();
      downloadManifest(await buildPayload(await form.validateFields()));
    } catch (error) {
      messageApi.warning(error instanceof Error ? error.message : "请完善表单");
    }
  };

  const submit = async (values: FormValues) => {
    try {
      validateFolder();
      setUploading(true);
      setUploadDraft(null);
      setProgress(0);
      setProgressLabel("正在计算 SHA256");
      const draft = await uploadKnowledgeResourceDraft(
        buildUploadPayload(values),
        sourceFiles,
        (completed, total) => {
          setProgressLabel("正在上传到 OSS");
          setProgress(Math.round(completed / total * 100));
        },
        (completed, total) => setProgress(Math.round(completed / total * 100)),
      );
      setUploadDraft(draft);
      if (draft.failures.length) {
        messageApi.warning(`有 ${draft.failures.length} 个文件上传失败，可在下方重试失败文件`);
        return;
      }
      setProgressLabel("正在完成上传校验");
      const result = await completeKnowledgeUpload(draft.initiate.uploadId, draft.completed);
      messageApi.success(`上传完成，版本 ID：${result.versionId}`);
      setUploadDraft(null);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "上传失败，请稍后重试");
    } finally {
      setUploading(false);
    }
  };

  const retryFailedFiles = async () => {
    if (!uploadDraft) return;
    setRetrying(true);
    setProgress(0);
    setProgressLabel("正在重试失败文件");
    try {
      const nextDraft = await retryFailedKnowledgeUploads(
        uploadDraft,
        sourceFiles,
        (completed, total) => setProgress(total ? Math.round(completed / total * 100) : 100),
      );
      setUploadDraft(nextDraft);
      if (nextDraft.failures.length) {
        messageApi.warning(`仍有 ${nextDraft.failures.length} 个文件上传失败`);
        return;
      }
      setProgressLabel("正在完成上传校验");
      const result = await completeKnowledgeUpload(nextDraft.initiate.uploadId, nextDraft.completed);
      messageApi.success(`上传完成，版本 ID：${result.versionId}`);
      setUploadDraft(null);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "重试失败，请稍后再试");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="page-stack">
      {contextHolder}
      <Button type="text" href="/knowledge" icon={<ArrowLeftOutlined />} className={styles.back}>返回知识库</Button>
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={16}>
          <Card className="surface-card" title="上传知识库资源">
            <Form form={form} layout="vertical" initialValues={{ resourceType: "script", version: "v1" }} onFinish={submit} requiredMark="optional">
              <Row gutter={16}>
                <Col xs={24} md={12}><Form.Item label="资源类型" name="resourceType" rules={[{ required: true }]}><Select options={[...KNOWLEDGE_RESOURCE_OPTIONS]} onChange={(value) => { if (value !== "script") form.setFieldValue("scriptGenre", undefined); }} /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="版本" name="version" rules={[{ required: true, message: "请输入版本号" }]}><Input placeholder="例如 v1 或 2026.08" /></Form.Item></Col>
              </Row>
              {isScript && <Form.Item label="剧本类型" name="scriptGenre" rules={[{ required: true, message: "请选择剧本类型" }]}><Select options={[...SCRIPT_GENRE_OPTIONS]} placeholder="请选择剧本类型" /></Form.Item>}
              <Form.Item label="资源名称" name="name" rules={[{ required: true, message: "请输入资源名称" }]}><Input placeholder={isScript ? "请输入剧本正式名称" : "请输入知识库资源名称"} /></Form.Item>
              <Form.Item label="标签" name="tags"><Select mode="tags" tokenSeparators={[","]} placeholder="输入后回车，例如：情感、6人、现代" /></Form.Item>
              <Form.Item label="说明" name="description"><Input.TextArea rows={3} maxLength={500} showCount placeholder="可填写版本变更、适用人数或内容说明" /></Form.Item>
              <Form.Item label={isScript ? "剧本文件夹" : "资源文件"} required>
                <Upload.Dragger directory={isScript} multiple fileList={fileList} beforeUpload={() => false} onChange={({ fileList: next }) => {
                  setFileList(next);
                  setUploadDraft(null);
                }} onRemove={(file) => { setFileList((current) => current.filter((item) => item.uid !== file.uid)); setUploadDraft(null); return true; }}>
                  <p><CloudUploadOutlined className={styles.uploadIcon} /></p>
                  <p>{isScript ? "点击或拖入完整剧本文件夹" : "点击或拖入一个或多个文件"}</p>
                  <Typography.Text type="secondary">保留原始目录与文件名，最多 500 个文件、总计 2 GB</Typography.Text>
                </Upload.Dragger>
              </Form.Item>
              {(uploading || retrying) && <Progress percent={progress} status="active" format={(percent) => `${progressLabel} ${percent}%`} style={{ marginBottom: 18 }} />}
              <Space wrap><Button type="primary" htmlType="submit" loading={uploading} icon={<CloudUploadOutlined />}>上传到 OSS</Button><Button onClick={exportCurrentManifest} icon={<DownloadOutlined />}>导出清单</Button></Space>
            </Form>
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Space orientation="vertical" size={20} style={{ width: "100%" }}>
            <Card className="surface-card" title="文件夹概览">
              <Row gutter={[12, 18]}><Col span={12}><Statistic title="文件数量" value={sourceFiles.length} suffix="个" /></Col><Col span={12}><Statistic title="总大小" value={formatBytes(totalSize)} /></Col></Row>
              <div className={styles.folderName}><FolderOpenOutlined /><span><small>根目录</small><strong>{rootFolder}</strong></span></div>
            </Card>
            <Card className="surface-card" title="存储与处理">
              <Space orientation="vertical" size={14}>
                <Typography.Text><SafetyCertificateOutlined className={styles.safeIcon} /> 浏览器不保存 OSS AccessKey</Typography.Text>
                <Typography.Text type="secondary">上传后保留目录清单、文件哈希和版本关系，可继续进入解析、切片与 RAG 索引流程。</Typography.Text>
                <Space wrap><Tag>门店隔离</Tag><Tag>版本化</Tag><Tag>可导出</Tag><Tag>可追溯</Tag></Space>
              </Space>
            </Card>
          </Space>
        </Col>
      </Row>
      {!!uploadDraft?.failures.length && (
        <Card
          className="surface-card"
          title={`失败文件（${uploadDraft.failures.length}）`}
          extra={<Button type="primary" loading={retrying} onClick={retryFailedFiles}>重试失败文件</Button>}
        >
          <Table
            rowKey="clientFileId"
            pagination={{ pageSize: 8 }}
            scroll={{ x: 760 }}
            dataSource={uploadDraft.failures}
            columns={[
              { title: "相对路径", dataIndex: "relativePath", render: (path) => <Space><FileOutlined />{path}</Space> },
              { title: "失败原因", dataIndex: "error", width: 360 },
            ]}
          />
          <Typography.Text type="secondary">
            当前页面未刷新时可直接重试；如果预签名地址过期，请重新发起上传。
          </Typography.Text>
        </Card>
      )}
      {sourceFiles.length > 0 && <Card className="surface-card" title="文件清单" extra={<Typography.Text type="secondary">展示前 50 项</Typography.Text>}><Table rowKey="clientFileId" pagination={false} scroll={{ x: 720 }} dataSource={sourceFiles.slice(0, 50).map(toManifestPreview)} columns={[{ title: "相对路径", dataIndex: "relativePath", render: (path) => <Space><FileOutlined />{path}</Space> }, { title: "类型", dataIndex: "contentType", width: 190, render: (type) => type || "未知" }, { title: "大小", dataIndex: "size", width: 110, render: formatBytes }]} /></Card>}
    </div>
  );
}
