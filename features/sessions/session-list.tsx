"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarOutlined, ClockCircleOutlined, PlusOutlined, SearchOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Form, Input, InputNumber, Modal, Progress, Select, Space, Tag, Typography, message } from "antd";
import {
  createGameSession,
  listDmOptions,
  listGameSessions,
  listScriptOptions,
  type DmOption,
  type GameSession,
  type GameSessionPayload,
  type GameSessionStatus,
  type ScriptOption,
} from "@/lib/game-sessions/game-session-api";
import styles from "./sessions.module.css";

const statusLabels: Record<string, string> = {
  recruiting: "报名中",
  full: "已满员",
  cancelled: "已取消",
  completed: "已结束",
};

function formatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

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
  const [keyword, setKeyword] = useState("");
  const [day, setDay] = useState(localDateValue());
  const [status, setStatus] = useState<GameSessionStatus | undefined>();
  const [scriptDocumentId, setScriptDocumentId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<GameSessionPayload>();
  const [messageApi, contextHolder] = message.useMessage();
  const debouncedKeyword = useDebouncedValue(keyword);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listGameSessions({
        keyword: debouncedKeyword,
        day: day || undefined,
        status,
        scriptDocumentId,
      }));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "场次加载失败");
    } finally {
      setLoading(false);
    }
  }, [day, debouncedKeyword, messageApi, scriptDocumentId, status]);

  const loadOptions = useCallback(async () => {
    try {
      const [scripts, dms] = await Promise.all([listScriptOptions(), listDmOptions()]);
      setScriptOptions(scripts);
      setDmOptions(dms);
    } catch (error) {
      messageApi.warning(error instanceof Error ? error.message : "下拉选项加载失败");
    }
  }, [messageApi]);

  useEffect(() => {
    void loadSessions();
    void loadOptions();
  }, [loadSessions, loadOptions]);

  const resetFilters = () => {
    setKeyword("");
    setDay(localDateValue());
    setStatus(undefined);
    setScriptDocumentId(undefined);
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
          <Button onClick={() => void loadSessions()} loading={loading}>查询</Button>
          <Button onClick={resetFilters}>重置</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新建场次</Button>
        </Space>
      </Card>

      {rows.length ? (
        <div className={styles.grid}>
          {rows.map((session) => {
            const percent = Math.min(100, Math.round((session.joinedSeats / session.capacity) * 100));
            return (
              <Card key={session.id} className={`surface-card ${styles.card}`} styles={{ body: { padding: 0 } }}>
                <div className={styles.cover}>
                  <Tag color={session.status === "full" ? "default" : "success"}>{statusLabels[session.status] ?? session.status}</Tag>
                  <span>{session.scriptName}</span>
                  <h3>{session.title}</h3>
                </div>
                <div className={styles.body}>
                  <Space orientation="vertical" size={10} style={{ width: "100%" }}>
                    <Typography.Text><CalendarOutlined /> {formatTime(session.startTime)}</Typography.Text>
                    <Space wrap separator={<span>·</span>}>
                      <span><ClockCircleOutlined /> {Math.round(session.durationMinutes / 60)} 小时</span>
                      <span><UserOutlined /> DM {session.dmName || "待定"}</span>
                    </Space>
                    <div>
                      <Space style={{ width: "100%", justifyContent: "space-between" }}>
                        <span><TeamOutlined /> 拼车进度</span>
                        <strong>{session.joinedSeats}/{session.capacity}</strong>
                      </Space>
                      <Progress percent={percent} showInfo={false} strokeColor="#6d5dfc" />
                    </div>
                    <Link href={`/sessions/${session.id}`}><Button block>查看场次详情</Button></Link>
                  </Space>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="surface-card"><Empty description={loading ? "加载中..." : "暂无场次，先创建一个可拼车剧本吧"} /></Card>
      )}

      <Modal title="新建剧本场次" open={open} onOk={() => void submit()} onCancel={() => setOpen(false)} confirmLoading={saving} width={720} okText="创建并进入详情">
        <Form form={form} layout="vertical" initialValues={{ durationMinutes: 240, minPlayers: 4, capacity: 6, priceCents: 0, startTime: datetimeLocalValue(new Date(Date.now() + 86400000).toISOString()) }}>
          <Form.Item name="scriptDocumentId" label="选择剧本" rules={[{ required: true, message: "请选择剧本" }]}>
            <Select
              showSearch
              placeholder="从知识库剧本资源中选择"
              optionFilterProp="label"
              options={scriptOptions.map((item) => ({ value: item.id, label: item.name }))}
              onChange={(value) => {
                const script = scriptOptions.find((item) => item.id === value);
                form.setFieldsValue({ scriptName: script?.name, title: script?.name });
              }}
            />
          </Form.Item>
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
          <Form.Item name="notes" label="内部备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
