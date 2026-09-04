"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, Typography, message } from "antd";
import {
  createRoom,
  createGameSession,
  deleteRoom,
  listDmOptions,
  listGameSessions,
  listRooms,
  listScriptOptions,
  updateRoom,
  type DmOption,
  type GameSession,
  type GameSessionPayload,
  type GameSessionStatus,
  type Room,
  type RoomPayload,
  type ScriptOption,
} from "@/lib/game-sessions/game-session-api";
import { SessionImageFields } from "./session-image-fields";
import { SessionCarCard } from "./session-car-card";
import { SessionScheduleBoard } from "./session-schedule-board";
import { listScriptMarketingAssets, type ScriptMarketingAssetResult } from "@/lib/script-marketing/script-marketing-api";
import { ScriptMarketingResult } from "@/features/script-marketing/script-marketing-result";
import styles from "./sessions.module.css";

function datetimeLocalValue(value: string) {
  return new Date(value).toISOString().slice(0, 16);
}

function localDateValue(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function useDebouncedValue<T>(value: T, delay = 450) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debouncedValue;
}

export function SessionList() {
  const router = useRouter();
  const [rows, setRows] = useState<GameSession[]>([]);
  const [scriptOptions, setScriptOptions] = useState<ScriptOption[]>([]);
  const [dmOptions, setDmOptions] = useState<DmOption[]>([]);
  const [roomOptions, setRoomOptions] = useState<Room[]>([]);
  const [keyword, setKeyword] = useState("");
  const [day, setDay] = useState(localDateValue());
  const [status, setStatus] = useState<GameSessionStatus | undefined>();
  const [scriptDocumentId, setScriptDocumentId] = useState<string | undefined>();
  const [roomId, setRoomId] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState("schedule");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomSaving, setRoomSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [marketingLoading, setMarketingLoading] = useState(false);
  const [marketingResult, setMarketingResult] = useState<ScriptMarketingAssetResult | null>(null);
  const [marketingVersions, setMarketingVersions] = useState<ScriptMarketingAssetResult[]>([]);
  const [form] = Form.useForm<GameSessionPayload>();
  const [roomForm] = Form.useForm<RoomPayload>();
  const selectedScriptDocumentId = Form.useWatch("scriptDocumentId", form);
  const [messageApi, contextHolder] = message.useMessage();
  const debouncedKeyword = useDebouncedValue(keyword);
  const [createInitialValues] = useState<GameSessionPayload>(() => ({
    durationMinutes: 240,
    minPlayers: 4,
    capacity: 6,
    priceCents: 0,
    coverImageSource: "manual",
    coverImageAssetId: null,
    detailImageSource: "manual",
    detailImageAssetIds: [],
    detailImageUrls: [],
    startTime: datetimeLocalValue(new Date(Date.now() + 86400000).toISOString()),
    title: "",
    scriptName: "",
  }));

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listGameSessions({
        keyword: debouncedKeyword,
        day: day || undefined,
        status,
        scriptDocumentId,
        roomId,
      }));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "场次加载失败");
    } finally {
      setLoading(false);
    }
  }, [day, debouncedKeyword, messageApi, roomId, scriptDocumentId, status]);

  const loadOptions = useCallback(async () => {
    try {
      const [scripts, dms, rooms] = await Promise.all([listScriptOptions(), listDmOptions(), listRooms()]);
      setScriptOptions(scripts);
      setDmOptions(dms);
      setRoomOptions(rooms);
    } catch (error) {
      messageApi.warning(error instanceof Error ? error.message : "下拉选项加载失败");
    }
  }, [messageApi]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSessions();
      void loadOptions();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSessions, loadOptions]);

  const resetFilters = () => {
    setKeyword("");
    setDay(localDateValue());
    setStatus(undefined);
    setScriptDocumentId(undefined);
    setRoomId(undefined);
  };

  const openRoomForm = (room?: Room) => {
    setEditingRoom(room ?? null);
    roomForm.setFieldsValue(room ? {
      name: room.name,
      capacity: room.capacity,
      location: room.location,
      status: room.status === "disabled" ? "disabled" : "active",
      notes: room.notes,
    } : {
      name: "",
      capacity: 6,
      location: "",
      status: "active",
      notes: "",
    });
    setRoomOpen(true);
  };

  const submitRoom = async () => {
    const values = await roomForm.validateFields();
    setRoomSaving(true);
    try {
      if (editingRoom) {
        await updateRoom(editingRoom.id, values);
        messageApi.success("房间已更新");
      } else {
        await createRoom(values);
        messageApi.success("房间已创建");
      }
      setRoomOpen(false);
      await loadOptions();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "房间保存失败");
    } finally {
      setRoomSaving(false);
    }
  };

  const removeRoom = async (target: Room) => {
    try {
      await deleteRoom(target.id);
      messageApi.success("房间已删除");
      await loadOptions();
      if (roomId === target.id) setRoomId(undefined);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "房间删除失败");
    }
  };

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const data = await createGameSession({
        ...values,
        startTime: new Date(values.startTime).toISOString(),
        priceCents: Math.round(Number(values.priceCents ?? 0) * 100),
      });
      messageApi.success("场次创建成功");
      setOpen(false);
      form.resetFields();
      router.push(`/sessions/${data.id}`);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "创建失败");
    } finally {
      setSaving(false);
    }
  };

  const loadApprovedMarketingVersions = async (documentId: string) => {
    setMarketingLoading(true);
    setMarketingResult(null);
    setMarketingVersions([]);
    try {
      setMarketingVersions(await listScriptMarketingAssets(documentId, "approved"));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "正式物料版本加载失败");
    } finally {
      setMarketingLoading(false);
    }
  };

  const applyMarketingToForm = (asset: ScriptMarketingAssetResult) => {
    const detailImageUrls = asset.detailImageUrls ?? [];
    form.setFieldsValue({
      title: asset.title,
      description: asset.detailCopy,
      coverImageSource: asset.coverImageUrl ? "ai_generated" : "manual",
    coverImageUrl: asset.coverImageUrl ?? undefined,
      detailImageSource: detailImageUrls.length ? "ai_generated" : "manual",
      detailImageUrls,
      notes: [
        "AI 运营物料正式版本：",
        `版本：V${asset.versionNo ?? "-"}`,
        `中文关键词：${asset.sellingPoints.join("、")}`,
        `适合人群：${asset.suitablePlayers.join("、")}`,
        `标签：${asset.tags.join("、")}`,
        `主图 Prompt：${asset.coverPrompt}`,
        `风险提醒：${asset.riskNotes.join("、")}`,
      ].join("\n"),
    });
    setMarketingResult(asset);
    messageApi.success(asset.coverImageUrl || detailImageUrls.length ? "已填充文字和 AI 图片" : "已填充文字；如需图片，请先在知识库详情生成");
  };

  const handleScriptChange = (documentId: string) => {
    const script = scriptOptions.find((item) => item.id === documentId);
    form.setFieldsValue({ scriptName: script?.name, title: script?.name });
    void loadApprovedMarketingVersions(documentId);
  };

  const activeRoomOptions = roomOptions
    .filter((room) => room.status === "active")
    .map((room) => ({ value: room.id, label: `${room.name}（${room.capacity}人）` }));

  const handleMarketingVersionChange = (assetId: string) => {
    const asset = marketingVersions.find((item) => item.assetId === assetId);
    if (asset) applyMarketingToForm(asset);
  };

  const openMarketingSource = () => {
    const documentId = form.getFieldValue("scriptDocumentId");
    if (!documentId) {
      messageApi.warning("请先选择剧本");
      return;
    }
    window.open(`/knowledge/${documentId}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="page-stack">
      {contextHolder}
      <Card className="surface-card">
        <Space wrap className={styles.toolbar}>
          <Input allowClear prefix={<SearchOutlined />} placeholder="搜索剧本或场次" value={keyword} onChange={(event) => setKeyword(event.target.value)} onPressEnter={() => void loadSessions()} />
          <Input type="date" value={day} onChange={(event) => setDay(event.target.value)} className={styles.dateInput} />
          <Select
            allowClear
            placeholder="场次类型"
            value={status}
            onChange={setStatus}
            className={styles.filterSelect}
            options={[
              { value: "recruiting", label: "报名中" },
              { value: "full", label: "已满员" },
              { value: "cancelled", label: "已取消" },
              { value: "completed", label: "已结束" },
            ]}
          />
          <Select
            allowClear
            showSearch
            placeholder="筛选剧本"
            value={scriptDocumentId}
            onChange={setScriptDocumentId}
            optionFilterProp="label"
            className={styles.scriptSelect}
            options={scriptOptions.map((item) => ({ value: item.id, label: item.name }))}
          />
          <Select
            allowClear
            placeholder="筛选房间"
            value={roomId}
            onChange={setRoomId}
            optionFilterProp="label"
            className={styles.roomSelect}
            options={activeRoomOptions}
          />
          <Button onClick={() => void loadSessions()} loading={loading}>查询</Button>
          <Button onClick={resetFilters}>重置</Button>
          <Button onClick={() => setRoomsOpen(true)}>房间管理</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新建场次</Button>
        </Space>
        <Tabs
          className={styles.viewSwitch}
          activeKey={viewMode}
          onChange={setViewMode}
          items={[
            { key: "schedule", label: "排期视图" },
            { key: "list", label: "列表视图" },
          ]}
        />
      </Card>

      {viewMode === "schedule" ? (
        <Card className="surface-card">
          <SessionScheduleBoard rooms={roomOptions} sessions={rows} />
        </Card>
      ) : rows.length ? (
        <div className={styles.grid}>
          {rows.map((session) => (
            <SessionCarCard key={session.id} session={session} href={`/sessions/${session.id}`} />
          ))}
        </div>
      ) : (
        <Card className="surface-card"><Empty description={loading ? "加载中..." : "暂无场次，先创建一个可拼车剧本吧"} /></Card>
      )}

      <Modal title="新建剧本场次" open={open} onOk={() => void submit()} onCancel={() => setOpen(false)} confirmLoading={saving} width={720} okText="创建并进入详情">
        <Form form={form} layout="vertical" initialValues={createInitialValues}>
          <Form.Item name="scriptDocumentId" label="选择剧本" rules={[{ required: true, message: "请选择剧本" }]}>
            <Select
              showSearch
              placeholder="从知识库剧本资源中选择"
              optionFilterProp="label"
              options={scriptOptions.map((item) => ({ value: item.id, label: item.name }))}
              onChange={handleScriptChange}
            />
          </Form.Item>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
                <Typography.Text type="secondary">这里使用知识库详情页中店长已确认的正式物料版本，选择后自动填充场次标题、详情文案和内部备注。</Typography.Text>
                <Button onClick={openMarketingSource}>去知识库生成/审批</Button>
              </Space>
              <Select
                allowClear
                loading={marketingLoading}
                placeholder="选择正式物料版本"
                disabled={!selectedScriptDocumentId}
                onChange={handleMarketingVersionChange}
                options={marketingVersions.map((item) => ({
                  value: item.assetId ?? "",
                  label: `V${item.versionNo ?? "-"} · ${item.title}`,
                }))}
              />
              {!marketingLoading && selectedScriptDocumentId && !marketingVersions.length ? (
                <Typography.Text type="secondary">该剧本暂无正式物料版本，请先到知识库详情页生成并审批。</Typography.Text>
              ) : null}
              {marketingResult ? <ScriptMarketingResult result={marketingResult} /> : null}
            </Space>
          </Card>
          <Form.Item name="scriptName" label="剧本名称" rules={[{ required: true }]}>
            <Input placeholder="选择剧本后自动带出，也可手动修改快照名称" />
          </Form.Item>
          <Form.Item name="title" label="场次标题" rules={[{ required: true }]}>
            <Input placeholder="例如：周六晚《捉小三》欢乐车" />
          </Form.Item>
          <div className={styles.formGrid}>
            <Form.Item name="startTime" label="开场时间" rules={[{ required: true }]}>
              <Input type="datetime-local" />
            </Form.Item>
            <Form.Item name="roomId" label="占用房间">
              <Select allowClear placeholder="选择房间" options={activeRoomOptions} />
            </Form.Item>
            <Form.Item name="dmUserId" label="带场 DM">
              <Select allowClear placeholder="选择 DM" options={dmOptions.map((item) => ({ value: item.id, label: item.nickname || item.phone || "未命名 DM" }))} />
            </Form.Item>
            <Form.Item name="durationMinutes" label="预计时长（分钟）">
              <InputNumber min={30} max={1440} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="capacity" label="最大人数">
              <InputNumber min={1} max={50} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="minPlayers" label="最低成团人数">
              <InputNumber min={1} max={50} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="priceCents" label="价格（元/人）">
              <InputNumber min={0} precision={2} style={{ width: "100%" }} />
            </Form.Item>
          </div>
          <Form.Item name="description" label="展示说明"><Input.TextArea rows={3} /></Form.Item>
          <SessionImageFields form={form} />
          <Form.Item name="notes" label="内部备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="房间管理" open={roomsOpen} onCancel={() => setRoomsOpen(false)} footer={null} width={760}>
        <div className={styles.roomToolbar}>
          <Typography.Text type="secondary">维护门店包间/房间，用于场次排期占用展示。</Typography.Text>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openRoomForm()}>新增房间</Button>
        </div>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={roomOptions}
          columns={[
            {
              title: "房间",
              dataIndex: "name",
              render: (_, record) => (
                <div className={styles.roomName}>
                  <Typography.Text strong>{record.name}</Typography.Text>
                  {record.location ? <Typography.Text type="secondary">{record.location}</Typography.Text> : null}
                </div>
              ),
            },
            { title: "容量", dataIndex: "capacity", width: 90, render: (value) => `${value} 人` },
            { title: "状态", dataIndex: "status", width: 100, render: (value) => <Tag color={value === "active" ? "success" : "default"}>{value === "active" ? "启用" : "停用"}</Tag> },
            { title: "备注", dataIndex: "notes", ellipsis: true },
            {
              title: "操作",
              width: 150,
              render: (_, record) => (
                <Space>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openRoomForm(record)}>编辑</Button>
                  <Popconfirm title="删除房间？" description="历史场次不会删除，但新排期不再展示该房间。" onConfirm={() => void removeRoom(record)}>
                    <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Modal>

      <Modal
        title={editingRoom ? "编辑房间" : "新增房间"}
        open={roomOpen}
        onOk={() => void submitRoom()}
        onCancel={() => setRoomOpen(false)}
        confirmLoading={roomSaving}
        okText="保存"
      >
        <Form form={roomForm} layout="vertical">
          <Form.Item name="name" label="房间名称" rules={[{ required: true, message: "请输入房间名称" }]}>
            <Input placeholder="例如：牡丹厅 / 1号房 / 沉浸房A" />
          </Form.Item>
          <div className={styles.formGrid}>
            <Form.Item name="capacity" label="建议人数" rules={[{ required: true }]}>
              <InputNumber min={1} max={50} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="status" label="状态" rules={[{ required: true }]}>
              <Select options={[{ value: "active", label: "启用" }, { value: "disabled", label: "停用" }]} />
            </Form.Item>
          </div>
          <Form.Item name="location" label="位置">
            <Input placeholder="例如：二楼靠窗 / 前台左侧" />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={3} placeholder="可记录适合本型、设备、隔音、装修风格等" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
