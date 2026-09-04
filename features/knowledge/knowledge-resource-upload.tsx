"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  FileOutlined,
  FolderOpenOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Button, Card, Col, Form, Input, Modal, Progress, Row, Select, Space, Statistic, Table, Tag, Typography, Upload, message } from "antd";
import type { UploadFile } from "antd";
import { downloadManifest, getRelativePath, isUploadableKnowledgeFile, toManifestFile, toManifestPreview, type BrowserFolderFile } from "@/lib/oss/knowledge-resource-manifest";
import { completeKnowledgeUpload, listScriptGenres, retryFailedKnowledgeUploads, uploadKnowledgeResourceDraft } from "@/lib/oss/knowledge-resource-api";
import { useIdempotencyKey } from "@/lib/hooks/use-idempotency-key";
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

type UploadDraftFromUrl = {
  documentId?: string;
  resourceType?: string;
  name?: string;
  scriptGenre?: string;
  description?: string;
  tags?: string;
  currentVersion?: string;
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
  return files.flatMap((file) => {
    if (!file.originFileObj) return [];
    const sourceFile = file.originFileObj as BrowserFolderFile;
    return isUploadableKnowledgeFile(sourceFile) ? [sourceFile] : [];
  });
}

function nextVersionLabel(version?: string): string {
  const raw = version?.trim();
  if (!raw) return "v1";
  const match = raw.match(/^(.*?)(\d+)(?:\.(\d+))?$/);
  if (!match) return `${raw}.1`;
  const [, prefix, major, minor] = match;
  if (minor === undefined) return `${prefix}${major}.1`;
  return `${prefix}${major}.${Number(minor) + 1}`;
}

export function KnowledgeResourceUpload({ initialDraft }: { initialDraft?: UploadDraftFromUrl }) {
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const documentId = initialDraft?.documentId;
  const isVersionUpload = Boolean(documentId);
  const resourceType = Form.useWatch("resourceType", form) ?? "script";
  const isScript = resourceType === "script";
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [uploadDraft, setUploadDraft] = useState<KnowledgeUploadDraft | null>(null);
  const [inspectingFiles, setInspectingFiles] = useState(false);
  const [inspectedFileCount, setInspectedFileCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("准备上传");
  const [progressTip, setProgressTip] = useState("选择文件夹后，点击上传会先读取文件并计算 SHA256 指纹。");
  const [scriptGenreOptions, setScriptGenreOptions] = useState([...SCRIPT_GENRE_OPTIONS]);
  const [messageApi, contextHolder] = message.useMessage();
  const inspectTimerRef = useRef<number | null>(null);
  const uploadIdempotency = useIdempotencyKey([fileList.length]);
  const sourceFiles = useMemo(() => getSourceFiles(fileList), [fileList]);
  const totalSize = useMemo(() => sourceFiles.reduce((sum, file) => sum + file.size, 0), [sourceFiles]);
  const rootFolder = sourceFiles[0] ? getRelativePath(sourceFiles[0]).split("/")[0] : "尚未选择";

  useEffect(() => {
    let mounted = true;
    listScriptGenres()
      .then((items) => {
        if (!mounted || !items.length) return;
        setScriptGenreOptions(items.map((item) => ({ label: item.label, value: item.value })));
      })
      .catch(() => {
        // 类型字典接口异常时使用本地兜底，不阻塞上传主流程。
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!initialDraft) return;
    form.setFieldsValue({
      resourceType: (initialDraft.resourceType as KnowledgeResourceType | undefined) ?? "script",
      name: initialDraft.name,
      version: nextVersionLabel(initialDraft.currentVersion),
      scriptGenre: initialDraft.scriptGenre,
      description: initialDraft.description,
      tags: initialDraft.tags ? initialDraft.tags.split(",").filter(Boolean) : undefined,
    });
  }, [form, initialDraft]);

  useEffect(() => () => {
    if (inspectTimerRef.current) window.clearTimeout(inspectTimerRef.current);
  }, []);

  const inspectSelectedFiles = (next: UploadFile[]) => {
    if (inspectTimerRef.current) window.clearTimeout(inspectTimerRef.current);
    const validCount = getSourceFiles(next).length;
    setInspectedFileCount(validCount);
    setInspectingFiles(validCount > 0);
    setFileList(next);
    setUploadDraft(null);
    inspectTimerRef.current = window.setTimeout(() => {
      setInspectingFiles(false);
      inspectTimerRef.current = null;
    }, 700);
  };

  const buildPayload = async (values: FormValues): Promise<CreateKnowledgeResourcePayload> => ({
    documentId,
    resourceType: values.resourceType,
    name: values.name,
    version: values.version,
    description: values.description,
    scriptGenre: values.resourceType === "script" ? values.scriptGenre : undefined,
    tags: values.tags ?? [],
    files: await Promise.all(sourceFiles.map(toManifestFile)),
  });

  const buildUploadPayload = (values: FormValues): Omit<CreateKnowledgeResourcePayload, "files"> => ({
    documentId,
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
      setProgressTip("正在读取本地文件并计算指纹，大文件或多文件夹会稍慢，请不要关闭页面。");
      const idempotencyKey = uploadIdempotency.reset();
      const draft = await uploadKnowledgeResourceDraft(
        buildUploadPayload(values),
        sourceFiles,
        (completed, total) => {
          setProgressLabel("正在上传到 OSS");
          setProgressTip(`已上传 ${completed}/${total} 个文件，失败文件会保留在页面内支持重试。`);
          setProgress(Math.round(completed / total * 100));
        },
        (completed, total) => {
          setProgressLabel("正在读取文件指纹");
          setProgressTip(`已读取 ${completed}/${total} 个文件，正在生成上传清单。`);
          setProgress(Math.round(completed / total * 100));
        },
        idempotencyKey,
      );
      setUploadDraft(draft);
      if (draft.failures.length) {
        setProgressTip(`上传中断：${draft.failures.length} 个文件失败，可直接重试失败文件。`);
        messageApi.warning(`有 ${draft.failures.length} 个文件上传失败，可在下方重试失败文件`);
        return;
      }
      setProgressLabel("正在完成上传校验");
      setProgressTip("正在通知后端完成上传，后端会校验文件数量和 SHA256。");
      const result = await completeKnowledgeUpload(draft.initiate.uploadId, draft.completed, idempotencyKey);
      messageApi.success(`上传完成，版本 ID：${result.versionId}`);
      setUploadDraft(null);
      uploadIdempotency.reset();
      router.push(`/knowledge/${result.documentId}?guide=load`);
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
    setProgressTip("仅重新上传失败文件，不会重复上传已成功的文件。");
    try {
      const nextDraft = await retryFailedKnowledgeUploads(
        uploadDraft,
        sourceFiles,
        (completed, total) => {
          setProgressTip(`已重试 ${completed}/${total} 个失败文件。`);
          setProgress(total ? Math.round(completed / total * 100) : 100);
        },
      );
      setUploadDraft(nextDraft);
      if (nextDraft.failures.length) {
        messageApi.warning(`仍有 ${nextDraft.failures.length} 个文件上传失败`);
        return;
      }
      setProgressLabel("正在完成上传校验");
      setProgressTip("失败文件已补齐，正在完成后端校验。");
      const result = await completeKnowledgeUpload(nextDraft.initiate.uploadId, nextDraft.completed, uploadIdempotency.getKey());
      messageApi.success(`上传完成，版本 ID：${result.versionId}`);
      setUploadDraft(null);
      uploadIdempotency.reset();
      router.push(`/knowledge/${result.documentId}?guide=load`);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "重试失败，请稍后再试");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="page-stack">
      {contextHolder}
      <Modal
        centered
        closable={false}
        footer={null}
        maskClosable={false}
        open={inspectingFiles || uploading || retrying}
        title={inspectingFiles ? "正在读取剧本文件夹" : retrying ? "正在重试失败文件" : "正在上传剧本文件夹"}
      >
        {inspectingFiles ? (
          <Space direction="vertical" size={14} style={{ width: "100%" }}>
            <Space align="center" className={styles.uploadModalHeader}>
              <FolderOpenOutlined className={styles.uploadModalIcon} />
              <Space direction="vertical" size={2}>
                <Typography.Text strong>正在识别文件清单</Typography.Text>
                <Typography.Text type="secondary">
                  已读取到 {inspectedFileCount} 个可上传文件，正在准备预览列表。
                </Typography.Text>
              </Space>
            </Space>
            <Progress percent={100} showInfo={false} status="active" strokeColor="#6d5dfc" />
            <Typography.Text type="secondary" className={styles.uploadModalHint}>
              如果文件夹很大，浏览器处理目录时会稍慢，请稍等几秒。
            </Typography.Text>
          </Space>
        ) : (
          <Space direction="vertical" size={14} style={{ width: "100%" }}>
            <Space align="center" className={styles.uploadModalHeader}>
              <CloudUploadOutlined className={styles.uploadModalIcon} />
              <Space direction="vertical" size={2}>
                <Typography.Text strong>{progressLabel}</Typography.Text>
                <Typography.Text type="secondary">{progressTip}</Typography.Text>
              </Space>
            </Space>
            <Progress percent={progress} status="active" strokeColor="#6d5dfc" />
            <Typography.Text type="secondary" className={styles.uploadModalHint}>
              大文件夹会先在本地读取并计算 SHA256，再上传到 OSS。这个过程请不要刷新或关闭页面。
            </Typography.Text>
          </Space>
        )}
      </Modal>
      <Button type="text" href={documentId ? `/knowledge/${documentId}` : "/knowledge"} htmlType="button" icon={<ArrowLeftOutlined />} className={styles.back}>返回知识库</Button>
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={16}>
          <Card className="surface-card" title={isVersionUpload ? "上传新版本" : "上传知识库资源"}>
            <Form form={form} layout="vertical" className={styles.uploadForm} initialValues={{ resourceType: "script", version: "v1" }} onFinish={submit} requiredMark="optional">
              {isVersionUpload && (
                <Typography.Paragraph type="secondary">
                  当前会为已有资源创建一个新版本。请上传完整文件夹，上传完成后新版本会成为当前有效版本。
                </Typography.Paragraph>
              )}
              <Row gutter={16}>
                <Col xs={24} md={12}><Form.Item label="资源类型" name="resourceType" rules={[{ required: true }]}><Select options={[...KNOWLEDGE_RESOURCE_OPTIONS]} onChange={(value) => { if (value !== "script") form.setFieldValue("scriptGenre", undefined); }} /></Form.Item></Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label={(
                      <Space size={6}>
                        <span>版本号</span>
                        {initialDraft?.currentVersion ? <Typography.Text type="secondary" className={styles.labelHint}>原版本：{initialDraft.currentVersion}</Typography.Text> : null}
                      </Space>
                    )}
                    name="version"
                    rules={[{ required: true, message: "请输入版本号" }]}
                  >
                    <Input placeholder="例如 v1.1 或 2026.08.1" />
                  </Form.Item>
                </Col>
              </Row>
              {isScript && <Form.Item label="剧本类型" name="scriptGenre" rules={[{ required: true, message: "请选择剧本类型" }]}><Select options={scriptGenreOptions} placeholder="请选择剧本类型" /></Form.Item>}
              <Form.Item label="资源名称" name="name" rules={[{ required: true, message: "请输入资源名称" }]}><Input placeholder={isScript ? "请输入剧本正式名称" : "请输入知识库资源名称"} /></Form.Item>
              <Form.Item label="标签" name="tags"><Select mode="tags" tokenSeparators={[","]} placeholder="输入后回车，例如：情感、6人、现代" /></Form.Item>
              <Form.Item label="说明" name="description"><Input.TextArea rows={3} maxLength={500} showCount placeholder="可填写版本变更、适用人数或内容说明" /></Form.Item>
              <Form.Item label={isScript ? "剧本文件夹" : "资源文件"} required>
                <Upload.Dragger
                  directory={isScript}
                  multiple
                  fileList={fileList}
                  beforeUpload={() => false}
                  onChange={({ fileList: next }) => inspectSelectedFiles(next)}
                  onRemove={(file) => { setFileList((current) => current.filter((item) => item.uid !== file.uid)); setUploadDraft(null); return true; }}
                >
                  <p><CloudUploadOutlined className={styles.uploadIcon} /></p>
                  <p>{isScript ? "点击或拖入完整剧本文件夹" : "点击或拖入一个或多个文件"}</p>
                  <Typography.Text type="secondary">保留原始目录与文件名，最多 500 个文件、总计 2 GB</Typography.Text>
                </Upload.Dragger>
              </Form.Item>
              <Space wrap>
                <Button type="primary" htmlType="submit" loading={uploading} icon={<CloudUploadOutlined />}>上传到 OSS</Button>
                <Button htmlType="button" onClick={exportCurrentManifest} icon={<DownloadOutlined />}>导出清单</Button>
              </Space>
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
          extra={<Button type="primary" htmlType="button" loading={retrying} onClick={retryFailedFiles}>重试失败文件</Button>}
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
