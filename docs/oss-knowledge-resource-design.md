# 统一知识资源 OSS 设计

## 目标

- 浏览器不持有 OSS AccessKey。
- 保留用户文件夹中的相对路径。
- 剧本作为 `script` 类型，与门店规则、FAQ、活动资料及其他文档统一管理。
- 同一知识资源支持多版本、回滚、RAG 重建和整包导出。
- 数据库保存业务身份与清单，OSS 只保存不可变文件对象。

## 推荐对象键

对象键只能由后端生成，前端使用预签名地址上传：

```text
stores/{store_id}/knowledge/{document_id}/versions/{version_id}/
├── source/{relative_path}
├── manifest/manifest.json
├── derived/parsed.json
├── derived/chunks.jsonl
└── exports/{export_job_id}.zip
```

不要使用资源名作为主路径。名称允许修改，也可能包含特殊字符；稳定 ID 才能保证可维护性。

## 上传流程

1. 前端读取文件夹，提交元数据和相对路径清单。
2. 后端创建 `document_id`、`version_id`，校验路径并返回每个文件的 OSS 预签名 PUT 地址。
3. 前端直接 PUT 到 OSS，收集 ETag。
4. 前端调用 complete 接口提交 ETag 清单。
5. 后端校验对象存在性、大小、哈希，写入 manifest 并发送 RAG 处理任务。

## 导出流程

导出任务读取 manifest，而不是扫描 OSS 前缀；按 relativePath 还原目录并生成 ZIP。ZIP 放入 `exports/`，设置生命周期规则自动过期。

## 可维护性约束

- source 文件不可覆盖；新版本必须使用新的 version_id。
- manifest 带 `manifestVersion`，为后续字段升级保留空间。
- OSS Bucket 私有读写，通过短期预签名 URL 访问。
- 限制相对路径中的 `..`、绝对路径、空对象名和控制字符。
- 数据库记录 SHA-256、size、content_type、etag 和处理状态。
- OSS 配置跨域只允许业务前端域名及 PUT/GET/HEAD。
