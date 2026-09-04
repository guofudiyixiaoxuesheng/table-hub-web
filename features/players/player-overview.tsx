"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChartOutlined, DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined, TeamOutlined, UserAddOutlined } from "@ant-design/icons";
import { Avatar, Button, Card, Descriptions, Drawer, Form, Input, List, Modal, Space, Statistic, Table, Tag, Typography, message } from "antd";
import {
  createPlayer,
  deletePlayer,
  getPlayerBehavior,
  listPlayers,
  updatePlayer,
  type PlayerBehaviorSummary,
  type StorePlayer,
  type StorePlayerPayload,
} from "@/lib/players/player-api";
import { SCRIPT_GENRE_OPTIONS } from "@/lib/oss/knowledge-resource-types";

const scriptGenreLabelMap = new Map(SCRIPT_GENRE_OPTIONS.map((item) => [item.value, item.label]));

function formatScriptGenre(value?: string | null) {
  if (!value) return "未分类";
  return scriptGenreLabelMap.get(value as never) ?? value;
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatMoney(priceCents: number) {
  return `¥${(priceCents / 100).toFixed(0)}`;
}

export function PlayerOverview() {
  const [rows, setRows] = useState<StorePlayer[]>([]);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StorePlayer | null>(null);
  const [behavior, setBehavior] = useState<PlayerBehaviorSummary | null>(null);
  const [behaviorOpen, setBehaviorOpen] = useState(false);
  const [behaviorLoading, setBehaviorLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<StorePlayerPayload & { confirmPassword?: string }>();
  const [messageApi, contextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const activePreferences = useMemo(() => new Set(rows.map((item) => item.preference).filter(Boolean)).size, [rows]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPlayers({ keyword, page, pageSize });
      setRows(data.items);
      setTotal(data.meta.total);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "玩家加载失败");
    } finally {
      setLoading(false);
    }
  }, [keyword, messageApi, page, pageSize]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (record: StorePlayer) => {
    setEditing(record);
    form.setFieldsValue({
      phone: record.phone ?? undefined,
      nickname: record.nickname,
      avatar_url: record.avatar_url,
      preference: record.preference,
      notes: record.notes,
    });
    setOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    const payload = { ...values };
    delete payload.confirmPassword;
    setSaving(true);
    try {
      if (editing) {
        await updatePlayer(editing.id, payload);
        messageApi.success("玩家已更新");
      } else {
        await createPlayer(payload);
        messageApi.success("玩家已创建");
      }
      setOpen(false);
      await load();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = (record: StorePlayer) => {
    modalApi.confirm({
      title: `删除玩家「${record.nickname || record.phone}」？`,
      content: "这里只会从当前门店玩家池移除，不会物理删除全局用户身份。",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        await deletePlayer(record.id);
        await load();
      },
    });
  };

  const openBehavior = async (record: StorePlayer) => {
    setBehaviorOpen(true);
    setBehaviorLoading(true);
    try {
      setBehavior(await getPlayerBehavior(record.id));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "玩家行为加载失败");
    } finally {
      setBehaviorLoading(false);
    }
  };

  return (
    <div className="page-grid">
      {contextHolder}
      {modalContextHolder}
      <Card className="surface-card span-4"><Statistic title="当前门店玩家" value={total} prefix={<TeamOutlined />} /></Card>
      <Card className="surface-card span-4"><Statistic title="本页玩家" value={rows.length} prefix={<UserAddOutlined />} /></Card>
      <Card className="surface-card span-4"><Statistic title="偏好标签数" value={activePreferences} /></Card>
      <Card
        className="surface-card span-12"
        title="玩家列表"
        extra={
          <Space wrap>
            <Input allowClear prefix={<SearchOutlined />} placeholder="搜索昵称/手机号/偏好" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1); }} onPressEnter={() => void load()} />
            <Button onClick={() => void load()}>查询</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增玩家</Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          scroll={{ x: 920 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
          columns={[
            {
              title: "玩家",
              dataIndex: "nickname",
              width: 220,
              render: (_, record) => (
                <Space>
                  <Avatar style={{ background: "#6d5dfc" }}>{(record.nickname || record.phone || "玩").slice(0, 1)}</Avatar>
                  <span>{record.nickname || "未命名玩家"}</span>
                </Space>
              ),
            },
            { title: "手机号", dataIndex: "phone", width: 160, render: (value) => value || "暂无" },
            { title: "偏好", dataIndex: "preference", width: 180, render: (value) => value ? <Tag>{value}</Tag> : "暂无" },
            { title: "备注", dataIndex: "notes", ellipsis: true, render: (value) => value || "暂无" },
            { title: "更新时间", dataIndex: "updated_at", width: 160, render: formatTime },
            {
              title: "操作",
              width: 150,
              fixed: "right",
              render: (_, record) => (
                <Space size={4}>
                  <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
                  <Button type="text" icon={<BarChartOutlined />} onClick={() => void openBehavior(record)}>行为</Button>
                  <Button icon={<DeleteOutlined />} onClick={() => remove(record)} className="danger-soft-button">删除</Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal title={editing ? "编辑玩家" : "新增玩家"} open={open} onOk={() => void submit()} onCancel={() => setOpen(false)} confirmLoading={saving}>
        <Form form={form} layout="vertical">
          <Form.Item name="phone" label="手机号" rules={[{ required: !editing, message: "请输入手机号" }]}><Input /></Form.Item>
          {!editing ? (
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
            </>
          ) : null}
          <Form.Item name="nickname" label="昵称"><Input /></Form.Item>
          <Form.Item name="preference" label="偏好"><Input placeholder="例如：情感本、欢乐机制、硬核推理" /></Form.Item>
          <Form.Item name="notes" label="备注"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="玩家行为详情"
        open={behaviorOpen}
        onClose={() => setBehaviorOpen(false)}
        width={520}
        loading={behaviorLoading}
      >
        {behavior ? (
          <Space direction="vertical" size={18} style={{ width: "100%" }}>
            <Card>
              <Space>
                <Avatar size={48} style={{ background: "#6d5dfc" }}>
                  {(behavior.store_player.nickname || behavior.store_player.phone || "玩").slice(0, 1)}
                </Avatar>
                <div>
                  <Typography.Title level={4} style={{ margin: 0 }}>{behavior.store_player.nickname || "未命名玩家"}</Typography.Title>
                  <Typography.Text type="secondary">{behavior.store_player.phone || "暂无手机号"}</Typography.Text>
                </div>
              </Space>
              <Typography.Paragraph style={{ marginTop: 16 }}>{behavior.ai_summary}</Typography.Paragraph>
            </Card>
            <Descriptions bordered column={2} size="small" items={[
              { key: "reservation", label: "预约次数", children: behavior.reservation_count },
              { key: "completed", label: "玩本次数", children: behavior.completed_count },
              { key: "cancelled", label: "跳车/取消", children: behavior.cancelled_count },
              { key: "rate", label: "取消率", children: `${Math.round(behavior.cancellation_rate * 100)}%` },
              { key: "active", label: "有效预约", children: behavior.active_reservation_count },
              { key: "spend", label: "消费估算", children: formatMoney(behavior.estimated_spend_cents) },
            ]} />
            <Card title="偏好类型">
              {behavior.favorite_genres.length ? behavior.favorite_genres.map((item) => <Tag key={item}>{formatScriptGenre(item)}</Tag>) : "暂无明显偏好"}
            </Card>
            <Card title="最近约车记录">
              <List
                dataSource={behavior.recent_sessions}
                locale={{ emptyText: "暂无约车记录" }}
                renderItem={(item) => (
                  <List.Item extra={<Tag color={item.join_status === "cancelled" ? "red" : "green"}>{item.join_status}</Tag>}>
                    <List.Item.Meta
                      title={`${item.title} · ${item.script_name}`}
                      description={`${formatTime(item.start_time)} · ${formatMoney(item.price_cents)} · ${formatScriptGenre(item.script_genre)} · 预约码 ${item.reservation_code}`}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Space>
        ) : null}
      </Drawer>
    </div>
  );
}
