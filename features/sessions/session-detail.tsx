"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftOutlined, CalendarOutlined, ClockCircleOutlined, DeleteOutlined, EditOutlined, PlusOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import { Avatar, Button, Card, Descriptions, Empty, Form, Input, InputNumber, List, Modal, Progress, Select, Space, Tag, Typography, message } from "antd";
import {
  addSessionPlayer,
  deleteSessionPlayer,
  getGameSession,
  listDmOptions,
  listScriptOptions,
  updateGameSession,
  type DmOption,
  type GameSessionDetail,
  type GameSessionPayload,
  type ScriptOption,
  type SessionPlayerPayload,
} from "@/lib/game-sessions/game-session-api";
import { createPlayer, listPlayers, type StorePlayer } from "@/lib/players/player-api";
import styles from "./sessions.module.css";

const statusLabels: Record<string, string> = {
  recruiting: "报名中",
  full: "已满员",
  cancelled: "已取消",
  completed: "已结束",
};

const playerStatusLabels: Record<string, string> = {
  pending: "待确认",
  confirmed: "已确认",
  cancelled: "已取消",
};

function formatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function toLocalInput(value: string) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export function SessionDetail({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<GameSessionDetail | null>(null);
  const [scriptOptions, setScriptOptions] = useState<ScriptOption[]>([]);
  const [dmOptions, setDmOptions] = useState<DmOption[]>([]);
  const [playerOptions, setPlayerOptions] = useState<StorePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [createPlayerFirst, setCreatePlayerFirst] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sessionForm] = Form.useForm<GameSessionPayload>();
  const [playerForm] = Form.useForm<SessionPlayerPayload & { selectedStorePlayerId?: string; preference?: string; password?: string; confirmPassword?: string }>();
  const [messageApi, contextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      setSession(await getGameSession(sessionId));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "场次详情加载失败");
    } finally {
      setLoading(false);
    }
  }, [messageApi, sessionId]);

  const loadOptions = useCallback(async () => {
    try {
      const [scripts, dms, players] = await Promise.all([listScriptOptions(), listDmOptions(), listPlayers({ pageSize: 100 })]);
      setScriptOptions(scripts);
      setDmOptions(dms);
      setPlayerOptions(players.items);
    } catch (error) {
      messageApi.warning(error instanceof Error ? error.message : "选项加载失败");
    }
  }, [messageApi]);

  useEffect(() => {
    void loadDetail();
    void loadOptions();
  }, [loadDetail, loadOptions]);

  const openEdit = () => {
    if (!session) return;
    sessionForm.setFieldsValue({
      scriptDocumentId: session.scriptDocumentId,
      dmUserId: session.dmUserId,
      title: session.title,
      scriptName: session.scriptName,
      startTime: toLocalInput(session.startTime),
      durationMinutes: session.durationMinutes,
      minPlayers: session.minPlayers,
      capacity: session.capacity,
      priceCents: session.priceCents / 100,
      description: session.description,
      notes: session.notes,
      status: session.status,
    });
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!session) return;
    const values = await sessionForm.validateFields();
    setSaving(true);
    try {
      setSession(await updateGameSession(session.id, {
        ...values,
        startTime: new Date(values.startTime).toISOString(),
        priceCents: Math.round(Number(values.priceCents ?? 0) * 100),
      }));
      setEditOpen(false);
      messageApi.success("场次已更新");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "更新失败");
    } finally {
      setSaving(false);
    }
  };

  const submitPlayer = async () => {
    if (!session) return;
    const values = await playerForm.validateFields();
    const { confirmPassword: _, ...cleanValues } = values;
    setSaving(true);
    try {
      let selected = playerOptions.find((item) => item.id === cleanValues.selectedStorePlayerId);
      if (createPlayerFirst) {
        selected = await createPlayer({
          phone: cleanValues.phone || "",
          password: cleanValues.password,
          nickname: cleanValues.playerName,
          preference: cleanValues.preference,
        });
        setPlayerOptions((current) => [selected!, ...current]);
      }
      const payload: SessionPlayerPayload = {
        userId: selected?.user_id ?? cleanValues.userId ?? null,
        playerName: selected?.nickname || cleanValues.playerName,
        phone: selected?.phone || cleanValues.phone,
        seatCount: cleanValues.seatCount,
        source: "manual",
        status: cleanValues.status,
        notes: cleanValues.notes,
      };
      await addSessionPlayer(session.id, payload);
      setPlayerOpen(false);
      setCreatePlayerFirst(false);
      playerForm.resetFields();
      await loadDetail();
      messageApi.success("约车玩家已添加");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "添加失败");
    } finally {
      setSaving(false);
    }
  };

  const removePlayer = (playerId: string) => {
    if (!session) return;
    modalApi.confirm({
      title: "移除该约车玩家？",
      okText: "移除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        await deleteSessionPlayer(session.id, playerId);
        await loadDetail();
      },
    });
  };

  if (!session) {
    return (
      <div className="page-stack">
        {contextHolder}
        <Link href="/sessions"><Button type="text" icon={<ArrowLeftOutlined />}>返回场次列表</Button></Link>
        <Card className="surface-card"><Empty description={loading ? "加载中..." : "场次不存在"} /></Card>
      </div>
    );
  }

  const percent = Math.min(100, Math.round((session.joinedSeats / session.capacity) * 100));

  return (
    <div className="page-stack">
      {contextHolder}
      {modalContextHolder}
      <Link href="/sessions"><Button type="text" icon={<ArrowLeftOutlined />}>返回场次列表</Button></Link>
      <div className="page-grid">
        <Card className="surface-card span-8">
          <Space orientation="vertical" size={18} style={{ width: "100%" }}>
            <Space><Tag color="purple">{session.scriptName}</Tag><Tag color="success">{statusLabels[session.status] ?? session.status}</Tag></Space>
            <Typography.Title level={2} style={{ margin: 0 }}>{session.title}</Typography.Title>
            <Descriptions column={{ xs: 1, sm: 2 }} items={[
              { key: "time", label: "开场时间", children: <><CalendarOutlined /> {formatTime(session.startTime)}</> },
              { key: "duration", label: "预计时长", children: <><ClockCircleOutlined /> {session.durationMinutes} 分钟</> },
              { key: "dm", label: "带场 DM", children: <><UserOutlined /> {session.dmName || "待定"}</> },
              { key: "people", label: "当前人数", children: <><TeamOutlined /> {session.joinedSeats}/{session.capacity}</> },
            ]} />
            <div><Typography.Text type="secondary">拼车进度</Typography.Text><Progress percent={percent} strokeColor="#6d5dfc" /></div>
            {session.description ? <Typography.Paragraph>{session.description}</Typography.Paragraph> : null}
          </Space>
        </Card>
        <Card className="surface-card span-4" title="快捷操作">
          <Space orientation="vertical" style={{ width: "100%" }}>
            <Button type="primary" block icon={<PlusOutlined />} onClick={() => setPlayerOpen(true)}>手动新增约车</Button>
            <Button block icon={<EditOutlined />} onClick={openEdit}>编辑场次信息</Button>
            <Button block>复制报名链接</Button>
          </Space>
        </Card>
        <Card className="surface-card span-12" title={`拼车玩家（${session.joinedSeats}/${session.capacity}）`}>
          <List
            dataSource={session.players}
            locale={{ emptyText: "暂无约车玩家" }}
            renderItem={(player) => (
              <List.Item
                actions={[<Button key="delete" type="text" danger icon={<DeleteOutlined />} onClick={() => removePlayer(player.id)}>移除</Button>]}
                extra={<Tag color={player.status === "confirmed" ? "success" : "processing"}>{playerStatusLabels[player.status] ?? player.status}</Tag>}
              >
                <List.Item.Meta
                  avatar={<Avatar style={{ background: "#efedff", color: "#5d4be2" }}>{player.playerName.slice(0, 1)}</Avatar>}
                  title={`${player.playerName} · ${player.seatCount} 人`}
                  description={`预约码 ${player.reservationCode}${player.phone ? ` · ${player.phone}` : ""}`}
                />
              </List.Item>
            )}
          />
        </Card>
      </div>

      <Modal title="编辑场次信息" open={editOpen} onOk={() => void submitEdit()} onCancel={() => setEditOpen(false)} confirmLoading={saving} width={720}>
        <Form form={sessionForm} layout="vertical">
          <Form.Item name="scriptDocumentId" label="选择剧本" rules={[{ required: true }]}>
            <Select options={scriptOptions.map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => {
              const script = scriptOptions.find((item) => item.id === value);
              sessionForm.setFieldsValue({ scriptName: script?.name });
            }} />
          </Form.Item>
          <Form.Item name="scriptName" label="剧本名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="title" label="场次标题" rules={[{ required: true }]}><Input /></Form.Item>
          <div className={styles.formGrid}>
            <Form.Item name="startTime" label="开场时间" rules={[{ required: true }]}><Input type="datetime-local" /></Form.Item>
            <Form.Item name="dmUserId" label="带场 DM"><Select allowClear options={dmOptions.map((item) => ({ value: item.id, label: item.nickname || item.phone || "未命名 DM" }))} /></Form.Item>
            <Form.Item name="durationMinutes" label="预计时长（分钟）"><InputNumber min={30} max={1440} style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="capacity" label="最大人数"><InputNumber min={1} max={50} style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="minPlayers" label="最低成团人数"><InputNumber min={1} max={50} style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="priceCents" label="价格（元/人）"><InputNumber min={0} precision={2} style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="status" label="状态"><Select options={[
              { value: "recruiting", label: "报名中" },
              { value: "full", label: "已满员" },
              { value: "cancelled", label: "已取消" },
              { value: "completed", label: "已结束" },
            ]} /></Form.Item>
          </div>
          <Form.Item name="description" label="展示说明"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="notes" label="内部备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="新增约车玩家" open={playerOpen} onOk={() => void submitPlayer()} onCancel={() => setPlayerOpen(false)} confirmLoading={saving}>
        <Form form={playerForm} layout="vertical" initialValues={{ seatCount: 1, status: "confirmed" }}>
          <Form.Item label="添加方式">
            <Select value={createPlayerFirst ? "new" : "existing"} onChange={(value) => setCreatePlayerFirst(value === "new")} options={[{ value: "existing", label: "从玩家列表选择" }, { value: "new", label: "手动创建新玩家" }]} />
          </Form.Item>
          {!createPlayerFirst ? (
            <Form.Item name="selectedStorePlayerId" label="选择玩家" rules={[{ required: true, message: "请选择玩家" }]}>
              <Select
                showSearch
                optionFilterProp="label"
                options={playerOptions.map((item) => ({ value: item.id, label: `${item.nickname || "未命名"}${item.phone ? ` · ${item.phone}` : ""}` }))}
                onChange={(value) => {
                  const player = playerOptions.find((item) => item.id === value);
                  playerForm.setFieldsValue({ playerName: player?.nickname || player?.phone || "", phone: player?.phone || undefined });
                }}
              />
            </Form.Item>
          ) : null}
          <Form.Item name="playerName" label="玩家名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="phone" label="手机号" rules={createPlayerFirst ? [{ required: true, message: "手动创建玩家需要手机号" }] : []}><Input /></Form.Item>
          {createPlayerFirst ? (
            <>
              <Form.Item name="password" label="登录密码" rules={[{ required: true, message: "请输入登录密码" }, { min: 8, message: "密码至少 8 位" }]}>
                <Input.Password placeholder="玩家后续可用手机号 + 密码登录" />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label="确认密码"
                dependencies={["password"]}
                rules={[
                  { required: true, message: "请再次输入密码" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("password") === value) return Promise.resolve();
                      return Promise.reject(new Error("两次输入的密码不一致"));
                    },
                  }),
                ]}
              >
                <Input.Password />
              </Form.Item>
              <Form.Item name="preference" label="玩家偏好"><Input placeholder="例如：欢乐本、情感本" /></Form.Item>
            </>
          ) : null}
          <Form.Item name="seatCount" label="占位人数"><InputNumber min={1} max={10} style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="status" label="状态"><Select options={[{ value: "pending", label: "待确认" }, { value: "confirmed", label: "已确认" }]} /></Form.Item>
          <Form.Item name="notes" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
