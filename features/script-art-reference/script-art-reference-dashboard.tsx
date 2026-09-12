"use client";

import { useCallback, useEffect, useMemo, useState, type Key } from "react";
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Card, Drawer, Empty, Form, Image, Input, Modal, Progress, Select, Space, Table, Tag, Typography, Upload, message } from "antd";
import type { UploadFile } from "antd";
import { createClientId } from "@/lib/utils/create-client-id";
import {
  analyzeArtReferenceImages,
  completeArtReferencePackageUpload,
  createArtReferencePackage,
  createArtReferenceStyleProfile,
  deleteArtReferenceImage,
  deleteArtReferencePackage,
  getArtReferencePackage,
  getArtReferenceTaxonomy,
  listArtReferencePackages,
  listArtReferenceStyleProfiles,
  updateArtReferenceImage,
  updateArtReferencePackage,
  uploadArtReferenceImage,
  type ArtReferenceImage,
  type ArtReferencePackage,
  type ArtReferenceStyleProfile,
  type ArtReferenceTaxonomy,
  type CreateArtReferencePackagePayload,
} from "@/lib/script-art-reference/script-art-reference-api";
import styles from "./script-art-reference-dashboard.module.css";

type BrowserImageFile = File & { webkitRelativePath?: string };

type FormValues = {
  title: string;
  scriptName: string;
  scriptSummary?: string;
  scriptTags?: string[];
  eraType?: string;
  dominantStyleType?: string;
  regionType?: string;
  moodTypes?: string[];
  copyrightNote?: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "default" },
  uploading: { label: "上传中", color: "processing" },
  uploaded: { label: "已上传", color: "success" },
  analyzing: { label: "分析中", color: "processing" },
  ready: { label: "已沉淀", color: "success" },
  failed: { label: "失败", color: "error" },
  pending: { label: "待上传", color: "default" },
};

function optionLabel(taxonomy: ArtReferenceTaxonomy | null, group: keyof ArtReferenceTaxonomy, value?: string | null) {
  if (!value) return "未选择";
  if (!taxonomy || group === "aliases") return value;
  const canonicalValue = taxonomy.aliases?.[group]?.[value] ?? value;
  const label = taxonomy[group].find((item) => item.value === canonicalValue)?.label;
  return label ? (canonicalValue === value ? label : `${label}（旧值）`) : value;
}

function tagOptions(taxonomy: ArtReferenceTaxonomy | null, group: keyof ArtReferenceTaxonomy) {
  if (group === "aliases") return [];
  return taxonomy?.[group].map((item) => ({ label: item.label, value: item.value })) ?? [];
}

function formatDate(value?: string | null) {
  if (!value) return "暂无";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function getImageFiles(files: UploadFile[]): BrowserImageFile[] {
  return files.flatMap((item) => {
    const file = item.originFileObj as BrowserImageFile | undefined;
    if (!file) return [];
    if (!file.type.startsWith("image/")) return [];
    return [file];
  });
}

function getRelativePath(file: BrowserImageFile) {
  return file.webkitRelativePath || file.name;
}

export function ScriptArtReferenceDashboard() {
  const [form] = Form.useForm<FormValues>();
  const [packageForm] = Form.useForm<FormValues>();
  const [editForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [taxonomy, setTaxonomy] = useState<ArtReferenceTaxonomy | null>(null);
  const [rows, setRows] = useState<ArtReferencePackage[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedPackageIds, setSelectedPackageIds] = useState<Key[]>([]);
  const [styleProfiles, setStyleProfiles] = useState<ArtReferenceStyleProfile[]>([]);
  const [styleProfileLoading, setStyleProfileLoading] = useState(false);
  const [imageAnalysisLoading, setImageAnalysisLoading] = useState(false);
  const [activeStyleProfile, setActiveStyleProfile] = useState<ArtReferenceStyleProfile | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [keyword, setKeyword] = useState("");
  const [styleType, setStyleType] = useState<string>();
  const [scriptTag, setScriptTag] = useState<string>();
  const [moodType, setMoodType] = useState<string>();
  const [eraType, setEraType] = useState<string>();
  const [regionType, setRegionType] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("等待选择图片");
  const [activePackage, setActivePackage] = useState<ArtReferencePackage | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ArtReferencePackage | null>(null);
  const [editingImage, setEditingImage] = useState<ArtReferenceImage | null>(null);

  const imageFiles = useMemo(() => getImageFiles(fileList), [fileList]);
  const uploadedCount = rows.reduce((sum, item) => sum + item.uploadedImageCount, 0);

  const loadPackages = useCallback(async () => {
    setLoading(true);
    try {
      const listResult = await listArtReferencePackages({
        page,
        pageSize,
        keyword: keyword.trim(),
        styleType,
        scriptTag,
        moodType,
        eraType,
        regionType,
      });
      setRows(listResult.items);
      setTotal(listResult.total);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "美术素材库加载失败");
    } finally {
      setLoading(false);
    }
  }, [eraType, keyword, messageApi, moodType, page, pageSize, regionType, scriptTag, styleType]);

  useEffect(() => {
    if (taxonomy) return;
    void getArtReferenceTaxonomy()
      .then(setTaxonomy)
      .catch((error) => messageApi.error(error instanceof Error ? error.message : "美术素材分类加载失败"));
  }, [messageApi, taxonomy]);

  useEffect(() => {
    void listArtReferenceStyleProfiles().then(setStyleProfiles).catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPackages(), 250);
    return () => window.clearTimeout(timer);
  }, [loadPackages]);

  const resetCreateModal = () => {
    form.resetFields();
    setFileList([]);
    setProgress(0);
    setProgressLabel("等待选择图片");
  };

  const openDetail = async (packageId: string) => {
    setDetailLoading(true);
    try {
      const detail = await getArtReferencePackage(packageId);
      setActivePackage(detail);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "素材包详情加载失败");
    } finally {
      setDetailLoading(false);
    }
  };

  const submitPackage = async (values: FormValues) => {
    if (!imageFiles.length) {
      messageApi.warning("请至少选择一张图片");
      return;
    }
    setUploading(true);
    setProgress(2);
    setProgressLabel("正在创建素材包");
    try {
      const files = imageFiles.map((file, index) => ({
        clientFileId: createClientId("art_"),
        fileName: file.name,
        relativePath: getRelativePath(file),
        contentType: file.type || "application/octet-stream",
        size: file.size,
        // 素材包通常是“一张主图 + 多张人物图”，默认先按人物图归类，主图可在详情中改为主海报。
        usageType: "character",
        styleType: values.dominantStyleType || "unknown",
        eraType: values.eraType || "unknown",
        moodTypes: values.moodTypes ?? [],
        compositionTypes: [],
        sortOrder: index + 1,
      }));
      const payload: CreateArtReferencePackagePayload = {
        title: values.title,
        scriptName: values.scriptName,
        scriptSummary: values.scriptSummary,
        scriptTags: values.scriptTags ?? [],
        eraType: values.eraType || "unknown",
        dominantStyleType: values.dominantStyleType || "unknown",
        regionType: values.regionType || "unknown",
        moodTypes: values.moodTypes ?? [],
        copyrightScope: "reference_only",
        copyrightNote: values.copyrightNote,
        images: files,
      };
      const created = await createArtReferencePackage(payload);
      const fileMap = new Map(files.map((file, index) => [file.clientFileId, imageFiles[index]]));
      const completed: Array<{ clientFileId: string; etag?: string | null }> = [];
      for (let index = 0; index < created.uploadTargets.length; index += 1) {
        const target = created.uploadTargets[index];
        const file = fileMap.get(target.clientFileId);
        if (!file) continue;
        setProgressLabel(`正在上传图片 ${index + 1}/${created.uploadTargets.length}`);
        const result = await uploadArtReferenceImage(target, file, (percent) => {
          const base = index / created.uploadTargets.length;
          setProgress(Math.round((base + percent / 100 / created.uploadTargets.length) * 90));
        });
        completed.push(result);
      }
      setProgress(94);
      setProgressLabel("正在确认 OSS 上传结果");
      await completeArtReferencePackageUpload(created.package.id, completed);
      setProgress(100);
      setProgressLabel("上传完成");
      messageApi.success("美术参考素材包上传完成");
      setModalOpen(false);
      resetCreateModal();
      setPage(1);
      await loadPackages();
      await openDetail(created.package.id);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "素材包上传失败");
    } finally {
      setUploading(false);
    }
  };

  const removePackage = (row: ArtReferencePackage) => {
    Modal.confirm({
      title: `删除素材包「${row.title}」？`,
      content: "删除后不会继续参与后续美术规律沉淀，OSS 原图暂不物理删除。",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        await deleteArtReferencePackage(row.id);
        messageApi.success("素材包已删除");
        setPage(1);
        await loadPackages();
      },
    });
  };

  const openEditPackage = (row: ArtReferencePackage) => {
    setEditingPackage(row);
    packageForm.setFieldsValue({
      title: row.title,
      scriptName: row.scriptName,
      scriptSummary: row.scriptSummary ?? undefined,
      scriptTags: row.scriptTags,
      eraType: row.eraType,
      dominantStyleType: row.dominantStyleType,
      regionType: row.regionType,
      moodTypes: row.moodTypes,
      copyrightNote: row.copyrightNote ?? undefined,
    });
  };

  const savePackage = async () => {
    if (!editingPackage) return;
    const values = await packageForm.validateFields();
    const result = await updateArtReferencePackage(editingPackage.id, {
      title: values.title,
      scriptName: values.scriptName,
      scriptSummary: values.scriptSummary,
      scriptTags: values.scriptTags ?? [],
      eraType: values.eraType || "unknown",
      dominantStyleType: values.dominantStyleType || "unknown",
      regionType: values.regionType || "unknown",
      moodTypes: values.moodTypes ?? [],
      copyrightNote: values.copyrightNote,
    });
    setRows((current) => current.map((item) => item.id === result.id ? { ...item, ...result, images: item.images } : item));
    setActivePackage((current) => current?.id === result.id ? result : current);
    setEditingPackage(null);
    messageApi.success("素材包基础信息已更新");
  };

  const openEditImage = (image: ArtReferenceImage) => {
    setEditingImage(image);
    editForm.setFieldsValue({
      usageType: image.usageType,
      styleType: image.styleType,
      eraType: image.eraType,
      moodTypes: image.moodTypes,
      compositionTypes: image.compositionTypes,
      caption: image.caption,
    });
  };

  const saveImage = async () => {
    if (!editingImage || !activePackage) return;
    const values = await editForm.validateFields();
    const result = await updateArtReferenceImage(editingImage.id, values);
    setActivePackage({
      ...activePackage,
      images: activePackage.images.map((item) => item.id === result.id ? result : item),
    });
    setEditingImage(null);
    messageApi.success("图片信息已更新");
  };

  const removeImage = async (image: ArtReferenceImage) => {
    if (!activePackage) return;
    await deleteArtReferenceImage(image.id);
    messageApi.success("图片记录已删除");
    await openDetail(activePackage.id);
    await loadPackages();
  };

  const generateStyleProfile = () => {
    if (selectedPackageIds.length < 2) {
      messageApi.warning("请至少勾选 2 个同类素材包后再提炼");
      return;
    }
    Modal.confirm({
      title: `提炼 ${selectedPackageIds.length} 个素材包的视觉规律？`,
      content: "会结合剧本标题、简介、标签与已填写的图片 caption 生成可复用提示词；不会覆盖原素材。",
      okText: "开始提炼",
      cancelText: "取消",
      onOk: async () => {
        setStyleProfileLoading(true);
        try {
          const profile = await createArtReferenceStyleProfile({
            packageIds: selectedPackageIds.map(String),
            filterSnapshot: { keyword, scriptTag, moodType, styleType, eraType, regionType },
          });
          setStyleProfiles((current) => [profile, ...current]);
          setActiveStyleProfile(profile);
          setSelectedPackageIds([]);
          messageApi.success("视觉规律档案已生成");
        } catch (error) {
          messageApi.error(error instanceof Error ? error.message : "视觉规律档案生成失败");
        } finally {
          setStyleProfileLoading(false);
        }
      },
    });
  };

  const analyzeSelectedImages = () => {
    if (!selectedPackageIds.length) {
      messageApi.warning("请先勾选要分析图片的素材包");
      return;
    }
    Modal.confirm({
      title: `分析 ${selectedPackageIds.length} 个素材包的图片？`,
      content: "会将这些素材包中最多 300 张已上传图片加入千问视觉分析后台队列。提交后可继续操作，素材状态会显示为“分析中”，完成后再提炼视觉规律。",
      okText: "开始分析",
      cancelText: "取消",
      onOk: async () => {
        setImageAnalysisLoading(true);
        try {
          const result = await analyzeArtReferenceImages(selectedPackageIds.map(String));
          messageApi.success(`已将 ${result.queuedImageCount} 张图片加入后台分析，可继续操作`);
          await loadPackages();
        } catch (error) {
          messageApi.error(error instanceof Error ? error.message : "图片视觉分析提交失败");
        } finally {
          setImageAnalysisLoading(false);
        }
      },
    });
  };

  return (
    <div className="page-stack">
      {contextHolder}
      <div className="summary-grid">
        <Card className="surface-card">
          <Typography.Text type="secondary">素材包数量</Typography.Text>
          <Typography.Title level={3} style={{ margin: "8px 0 0" }}>{total}</Typography.Title>
        </Card>
        <Card className="surface-card">
          <Typography.Text type="secondary">已上传图片</Typography.Text>
          <Typography.Title level={3} style={{ margin: "8px 0 0" }}>{uploadedCount}</Typography.Title>
        </Card>
        <Card className="surface-card">
          <Typography.Text type="secondary">当前阶段</Typography.Text>
          <Typography.Title level={3} style={{ margin: "8px 0 0" }}>积累样本</Typography.Title>
        </Card>
      </div>

      <Card className="surface-card">
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <div className={styles.toolbar}>
            <Input.Search allowClear placeholder="搜索剧本名 / 素材包标题" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1); }} onSearch={() => void loadPackages()} />
            <Select allowClear placeholder="剧本标签" value={scriptTag} onChange={(value) => { setScriptTag(value); setPage(1); }} options={tagOptions(taxonomy, "scriptTags")} />
            <Select allowClear placeholder="画风" value={styleType} onChange={(value) => { setStyleType(value); setPage(1); }} options={tagOptions(taxonomy, "styleTypes")} />
            <Select allowClear placeholder="年代" value={eraType} onChange={(value) => { setEraType(value); setPage(1); }} options={tagOptions(taxonomy, "eraTypes")} />
            <Select allowClear placeholder="地域" value={regionType} onChange={(value) => { setRegionType(value); setPage(1); }} options={tagOptions(taxonomy, "regionTypes")} />
            <Select allowClear placeholder="辅助氛围" value={moodType} onChange={(value) => { setMoodType(value); setPage(1); }} options={tagOptions(taxonomy, "moodTypes")} />
            <Button icon={<ReloadOutlined />} onClick={() => void loadPackages()}>刷新</Button>
          </div>
          <Space wrap>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>上传素材包</Button>
            <Button loading={imageAnalysisLoading} disabled={!selectedPackageIds.length} onClick={analyzeSelectedImages}>分析所选图片</Button>
            <Button loading={styleProfileLoading} disabled={selectedPackageIds.length < 2} onClick={generateStyleProfile}>一键提炼视觉规律{selectedPackageIds.length ? `（${selectedPackageIds.length}）` : ""}</Button>
            <Typography.Text type="secondary">建议只做粗分桶：主画风 + 年代 + 地域。细节让后续 AI 从图片和 caption 里提取。</Typography.Text>
          </Space>

          <Table
            rowKey="id"
            rowSelection={{
              selectedRowKeys: selectedPackageIds,
              onChange: setSelectedPackageIds,
              preserveSelectedRowKeys: true,
            }}
            loading={loading}
            dataSource={rows}
            scroll={{ x: 980 }}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              pageSizeOptions: [12, 24, 48],
              showTotal: (value) => `共 ${value} 个素材包`,
              onChange: (nextPage, nextPageSize) => {
                setPage(nextPageSize !== pageSize ? 1 : nextPage);
                setPageSize(nextPageSize);
              },
            }}
            locale={{ emptyText: <Empty description="暂无美术参考素材包" /> }}
            columns={[
              {
                title: "剧本 / 素材包",
                fixed: "left",
                width: 240,
                render: (_, row) => (
                  <Space direction="vertical" size={2}>
                    <Typography.Link onClick={() => void openDetail(row.id)}>{row.scriptName}</Typography.Link>
                    <Typography.Text type="secondary" ellipsis>{row.title}</Typography.Text>
                  </Space>
                ),
              },
              {
                title: "标签",
                width: 220,
                render: (_, row) => <Space wrap size={[4, 4]}>{row.scriptTags.slice(0, 4).map((tag) => <Tag bordered key={tag}>{optionLabel(taxonomy, "scriptTags", tag)}</Tag>)}</Space>,
              },
              {
                title: "画风",
                width: 150,
                render: (_, row) => <Tag bordered color="blue">{optionLabel(taxonomy, "styleTypes", row.dominantStyleType)}</Tag>,
              },
              {
                title: "时代",
                width: 130,
                render: (_, row) => <Tag bordered>{optionLabel(taxonomy, "eraTypes", row.eraType)}</Tag>,
              },
              {
                title: "地域",
                width: 130,
                render: (_, row) => <Tag bordered>{optionLabel(taxonomy, "regionTypes", row.regionType)}</Tag>,
              },
              {
                title: "图片",
                width: 110,
                render: (_, row) => `${row.uploadedImageCount}/${row.imageCount}`,
              },
              {
                title: "状态",
                width: 120,
                render: (_, row) => {
                  const status = STATUS_LABELS[row.status] ?? { label: row.status, color: "default" };
                  return <Tag bordered color={status.color}>{status.label}</Tag>;
                },
              },
              { title: "更新时间", width: 180, render: (_, row) => formatDate(row.updatedAt) },
              {
                title: "操作",
                fixed: "right",
                width: 150,
                render: (_, row) => (
                  <Space>
                    <Button size="small" icon={<EyeOutlined />} onClick={() => void openDetail(row.id)}>详情</Button>
                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removePackage(row)}>删除</Button>
                  </Space>
                ),
              },
            ]}
          />
          {styleProfiles.length > 0 && (
            <Card size="small" title="已提炼的视觉规律档案">
              <Space wrap>
                {styleProfiles.slice(0, 6).map((profile) => (
                  <Button key={profile.id} type="link" onClick={() => setActiveStyleProfile(profile)}>
                    {profile.name}（{profile.sampleCount} 套）
                  </Button>
                ))}
              </Space>
            </Card>
          )}
        </Space>
      </Card>

      <Drawer title={activeStyleProfile?.name ?? "视觉规律档案"} open={Boolean(activeStyleProfile)} onClose={() => setActiveStyleProfile(null)} width={760}>
        {activeStyleProfile && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Typography.Text type="secondary">基于 {activeStyleProfile.sampleCount} 个素材包提炼；用于后续结合剧本标题、简介和场次信息生成主图、详情图与朋友圈图。</Typography.Text>
            <Typography.Paragraph><strong>视觉总结：</strong>{String(activeStyleProfile.analysisJson.styleSummary ?? "暂无")}</Typography.Paragraph>
            {(["compositionRules", "colorAndLighting", "visualMetaphors", "titleAssociationRules"] as const).map((key) => (
              <div key={key}>
                <Typography.Text strong>{({ compositionRules: "构图规律", colorAndLighting: "色彩与光影", visualMetaphors: "视觉隐喻", titleAssociationRules: "标题关联规则" } as Record<string, string>)[key]}</Typography.Text>
                <ul>{Array.isArray(activeStyleProfile.analysisJson[key]) && (activeStyleProfile.analysisJson[key] as string[]).map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            ))}
            <Card size="small" title="可复用生图提示词模板"><Typography.Paragraph copyable style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>{activeStyleProfile.promptTemplate}</Typography.Paragraph></Card>
            <Card size="small" title="负向提示词"><Typography.Paragraph copyable style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>{activeStyleProfile.negativePrompt || "暂无"}</Typography.Paragraph></Card>
          </Space>
        )}
      </Drawer>

      <Modal
        title="上传美术参考素材包"
        open={modalOpen}
        onCancel={() => { if (!uploading) { setModalOpen(false); resetCreateModal(); } }}
        onOk={() => form.submit()}
        okText="创建并上传"
        cancelText="取消"
        confirmLoading={uploading}
        width={900}
        destroyOnHidden
      >
        <div className={styles.uploadGrid}>
          <Form form={form} layout="vertical" onFinish={submitPackage} initialValues={{ eraType: "unknown", dominantStyleType: "unknown", regionType: "unknown" }}>
            <Form.Item label="素材包标题" name="title" rules={[{ required: true, message: "请输入素材包标题" }]}>
              <Input placeholder="例如：捉小三 民国悬疑主视觉参考" />
            </Form.Item>
            <Form.Item label="剧本名称" name="scriptName" rules={[{ required: true, message: "请输入剧本名称" }]}>
              <Input placeholder="例如：捉小三" />
            </Form.Item>
            <Form.Item label="剧本标签" name="scriptTags">
              <Select mode="multiple" allowClear placeholder="推理、欢乐、豪门..." options={tagOptions(taxonomy, "scriptTags")} />
            </Form.Item>
            <Space.Compact block>
              <Form.Item label="主画风" name="dominantStyleType" style={{ width: "34%" }}>
                <Select options={tagOptions(taxonomy, "styleTypes")} />
              </Form.Item>
              <Form.Item label="年代" name="eraType" style={{ width: "33%" }}>
                <Select options={tagOptions(taxonomy, "eraTypes")} />
              </Form.Item>
              <Form.Item label="地域" name="regionType" style={{ width: "33%" }}>
                <Select options={tagOptions(taxonomy, "regionTypes")} />
              </Form.Item>
            </Space.Compact>
            <Form.Item label="辅助氛围（可选）" name="moodTypes">
              <Select mode="multiple" allowClear placeholder="不确定可以不选，后续让 AI 自动提取" options={tagOptions(taxonomy, "moodTypes")} />
            </Form.Item>
            <Form.Item label="剧本简介" name="scriptSummary">
              <Input.TextArea rows={4} placeholder="可粘贴发行简介、门店卖点或你自己的理解" />
            </Form.Item>
            <Form.Item label="版权备注" name="copyrightNote">
              <Input.TextArea rows={2} placeholder="例如：仅用于内部学习参考，不复刻原图构图和标题字" />
            </Form.Item>
          </Form>
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Upload.Dragger
              directory
              multiple
              fileList={fileList}
              beforeUpload={() => false}
              accept="image/*"
              onChange={({ fileList: next }) => setFileList(next)}
            >
              <p className="ant-upload-drag-icon"><UploadOutlined /></p>
              <p className="ant-upload-text">拖入图片文件夹或点击选择图片</p>
              <p className="ant-upload-hint">支持主图、详情图、人物图、朋友圈图等，先上传 OSS，后续再统一做美术规律沉淀。</p>
            </Upload.Dragger>
            <Card size="small">
              <Space direction="vertical" style={{ width: "100%" }}>
                <Typography.Text>已识别图片：{imageFiles.length} 张</Typography.Text>
                <Typography.Text type="secondary">总大小：{formatBytes(imageFiles.reduce((sum, file) => sum + file.size, 0))}</Typography.Text>
                <Progress percent={progress} size="small" />
                <Typography.Text className={styles.fileHint}>{progressLabel}</Typography.Text>
              </Space>
            </Card>
          </Space>
        </div>
      </Modal>

      <Drawer
        title={activePackage ? `${activePackage.scriptName} · 美术素材` : "美术素材详情"}
        open={Boolean(activePackage)}
        onClose={() => setActivePackage(null)}
        width={980}
      >
        {detailLoading || !activePackage ? null : (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Card>
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Space align="start" style={{ justifyContent: "space-between", width: "100%" }}>
                  <Typography.Title level={4} style={{ margin: 0 }}>{activePackage.title}</Typography.Title>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEditPackage(activePackage)}>编辑基础信息</Button>
                </Space>
                <Space wrap>
                  <Tag bordered color="blue">{optionLabel(taxonomy, "styleTypes", activePackage.dominantStyleType)}</Tag>
                  <Tag bordered>{optionLabel(taxonomy, "eraTypes", activePackage.eraType)}</Tag>
                  <Tag bordered>{optionLabel(taxonomy, "regionTypes", activePackage.regionType)}</Tag>
                  {activePackage.moodTypes.map((tag) => <Tag bordered key={tag}>{optionLabel(taxonomy, "moodTypes", tag)}</Tag>)}
                </Space>
                <Typography.Paragraph type="secondary" style={{ margin: 0 }}>{activePackage.scriptSummary || "暂无简介"}</Typography.Paragraph>
              </Space>
            </Card>
            <div className={styles.imageGrid}>
              {activePackage.images.map((image) => {
                const status = STATUS_LABELS[image.status] ?? { label: image.status, color: "default" };
                return (
                  <Card
                    className={styles.imageCard}
                    key={image.id}
                    actions={[
                      <Button type="link" size="small" key="edit" onClick={() => openEditImage(image)}>编辑</Button>,
                      <Button type="link" size="small" danger key="delete" onClick={() => void removeImage(image)}>删除</Button>,
                    ]}
                  >
                    {image.imageUrl ? <Image className={styles.thumb} src={image.imageUrl} alt={image.fileName} /> : <div className={styles.thumb} />}
                    <Space direction="vertical" size={4} style={{ width: "100%", marginTop: 8 }}>
                      <Typography.Text ellipsis={{ tooltip: image.relativePath }}>{image.fileName}</Typography.Text>
                      <Space wrap size={[4, 4]}>
                        <Tag bordered color={status.color}>{status.label}</Tag>
                        <Tag bordered>{optionLabel(taxonomy, "usageTypes", image.usageType)}</Tag>
                      </Space>
                      <Typography.Text className={styles.fileHint} ellipsis={{ tooltip: image.relativePath }}>{image.relativePath}</Typography.Text>
                    </Space>
                  </Card>
                );
              })}
            </div>
          </Space>
        )}
      </Drawer>

      <Modal title="编辑图片标签" open={Boolean(editingImage)} onCancel={() => setEditingImage(null)} onOk={() => void saveImage()} okText="保存" cancelText="取消">
        <Form form={editForm} layout="vertical">
          <Form.Item label="图片用途" name="usageType"><Select options={tagOptions(taxonomy, "usageTypes")} /></Form.Item>
          <Form.Item label="画风" name="styleType"><Select options={tagOptions(taxonomy, "styleTypes")} /></Form.Item>
          <Form.Item label="时代背景" name="eraType"><Select options={tagOptions(taxonomy, "eraTypes")} /></Form.Item>
          <Form.Item label="氛围" name="moodTypes"><Select mode="multiple" options={tagOptions(taxonomy, "moodTypes")} /></Form.Item>
          <Form.Item label="构图" name="compositionTypes"><Select mode="multiple" options={tagOptions(taxonomy, "compositionTypes")} /></Form.Item>
          <Form.Item label="Caption / 人工描述" name="caption"><Input.TextArea rows={5} placeholder="先人工写也可以，后续会接多模态模型自动提取" /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑素材包基础信息"
        open={Boolean(editingPackage)}
        onCancel={() => setEditingPackage(null)}
        onOk={() => void savePackage()}
        okText="保存"
        cancelText="取消"
        width={760}
      >
        <Form form={packageForm} layout="vertical">
          <Form.Item label="素材包标题" name="title" rules={[{ required: true, message: "请输入素材包标题" }]}>
            <Input placeholder="例如：捉小三 民国悬疑主视觉参考" />
          </Form.Item>
          <Form.Item label="剧本名称" name="scriptName" rules={[{ required: true, message: "请输入剧本名称" }]}>
            <Input placeholder="例如：捉小三" />
          </Form.Item>
          <Form.Item label="剧本标签" name="scriptTags">
            <Select mode="multiple" allowClear placeholder="推理、欢乐、豪门..." options={tagOptions(taxonomy, "scriptTags")} />
          </Form.Item>
          <Space.Compact block>
            <Form.Item label="主画风" name="dominantStyleType" style={{ width: "34%" }}>
              <Select options={tagOptions(taxonomy, "styleTypes")} />
            </Form.Item>
            <Form.Item label="年代" name="eraType" style={{ width: "33%" }}>
              <Select options={tagOptions(taxonomy, "eraTypes")} />
            </Form.Item>
            <Form.Item label="地域" name="regionType" style={{ width: "33%" }}>
              <Select options={tagOptions(taxonomy, "regionTypes")} />
            </Form.Item>
          </Space.Compact>
          <Form.Item label="辅助氛围（可选）" name="moodTypes">
            <Select mode="multiple" allowClear placeholder="不确定可以不选，后续让 AI 自动提取" options={tagOptions(taxonomy, "moodTypes")} />
          </Form.Item>
          <Form.Item label="剧本简介" name="scriptSummary">
            <Input.TextArea rows={4} placeholder="可粘贴发行简介、门店卖点或你自己的理解" />
          </Form.Item>
          <Form.Item label="版权备注" name="copyrightNote">
            <Input.TextArea rows={2} placeholder="例如：仅用于内部学习参考，不复刻原图构图和标题字" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
