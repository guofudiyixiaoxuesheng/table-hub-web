"use client";

import { DeleteOutlined, HistoryOutlined, SendOutlined, ThunderboltFilled, UserSwitchOutlined } from "@ant-design/icons";
import { Avatar, Button, Drawer, Empty, Input, Modal, Space, Spin, message as antdMessage } from "antd";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteChatSession,
  getChatSessionMessages,
  getGuestId,
  listChatSessions,
  streamChatMessage,
  type ChatMessage,
  type ChatSessionSummary,
} from "@/lib/chat/chat-api";
import { ChatMessageContent } from "@/features/chat/components/chat-message-content";
import styles from "./player-mobile-shell.module.css";

const quickQuestions = ["周六有没有能拼的剧本？", "推荐新手 6 人本", "恐怖本适合几个人？"];

function formatChatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PlayerChatInner() {
  const searchParams = useSearchParams();
  const initialQuestion = useMemo(() => searchParams.get("question") ?? "", [searchParams]);
  const [inputValue, setInputValue] = useState(initialQuestion);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [sending, setSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingThreadId, setLoadingThreadId] = useState<string | null>(null);
  const [humanModalOpen, setHumanModalOpen] = useState(false);
  const [messageApi, contextHolder] = antdMessage.useMessage();

  const refreshSessions = useCallback(async () => {
    setLoadingHistory(true);
    try {
      setSessions(await listChatSessions(getGuestId()));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "加载历史失败");
    } finally {
      setLoadingHistory(false);
    }
  }, [messageApi]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshSessions();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshSessions]);

  const createSession = () => {
    setThreadId(null);
    setMessages([]);
    setInputValue("");
    setHistoryOpen(false);
  };

  const loadSession = async (targetThreadId: string) => {
    setLoadingThreadId(targetThreadId);
    try {
      const result = await getChatSessionMessages(targetThreadId, getGuestId());
      setThreadId(result.threadId);
      setMessages(result.messages.map((item) => ({
        role: item.role,
        messageType: item.messageType,
        content: item.content,
        metadata: item.metadata,
      })));
      setHistoryOpen(false);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "加载对话失败");
    } finally {
      setLoadingThreadId(null);
    }
  };

  const removeSession = async (targetThreadId: string) => {
    try {
      await deleteChatSession(targetThreadId, getGuestId());
      if (threadId === targetThreadId) createSession();
      await refreshSessions();
      messageApi.success("对话已删除");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "删除失败");
    }
  };

  const submit = async (value = inputValue) => {
    const content = value.trim();
    if (!content || sending) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", messageType: "text", content }];
    setMessages([...nextMessages, { role: "assistant", messageType: "text", content: "正在理解你的问题…" }]);
    setInputValue("");
    setSending(true);

    try {
      const result = await streamChatMessage(content, {
        threadId,
        guestId: getGuestId(),
        streamMode: "updates",
        onEvent: (event) => {
          if (event.event === "session") {
            setThreadId(event.data.threadId);
            return;
          }
          if (event.event === "delta") {
            setMessages((current) => {
              const copy = [...current];
              const lastIndex = copy.length - 1;
              if (copy[lastIndex]?.role !== "assistant") return copy;
              const currentContent = copy[lastIndex].content;
              const shouldReplace = currentContent.startsWith("正在") || currentContent.startsWith("已识别场景");
              copy[lastIndex] = {
                ...copy[lastIndex],
                content: `${shouldReplace ? "" : currentContent}${event.data.delta}`,
              };
              return copy;
            });
          }
        },
      });
      setThreadId(result.threadId);
      setMessages([...nextMessages, { role: "assistant", messageType: "text", content: result.answer, metadata: { scene: result.scene } }]);
      void refreshSessions();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "AI 回复失败");
      setMessages(nextMessages);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className={styles.playerChat}>
      {contextHolder}
      <div className={styles.playerChatHeader}>
        <div className={styles.playerChatIdentity}>
          <Avatar icon={<ThunderboltFilled />} style={{ background: "#6d5dfc" }} />
          <div>
            <strong>TableHub AI 客服</strong>
            <span>{threadId ? `会话 ${threadId.slice(0, 8)}...` : "可咨询剧本、拼车和门店规则"}</span>
          </div>
        </div>
        <div className={styles.playerChatActions}>
          <Button size="small" onClick={createSession}>新对话</Button>
          <Button size="small" icon={<HistoryOutlined />} onClick={() => { setHistoryOpen(true); void refreshSessions(); }}>历史</Button>
          <Button size="small" icon={<UserSwitchOutlined />} onClick={() => setHumanModalOpen(true)}>转人工</Button>
        </div>
      </div>

      <div className={styles.playerChatMessages}>
        {messages.length === 0 ? (
          <div className={styles.playerChatWelcome}>
            <h1>想问什么都可以</h1>
            <p>例如“周六有没有能拼的欢乐本？”、“捉小三适合新手吗？”</p>
            <Space direction="vertical" style={{ width: "100%" }}>
              {quickQuestions.map((question) => (
                <Button block key={question} onClick={() => void submit(question)}>
                  {question}
                </Button>
              ))}
            </Space>
          </div>
        ) : (
          messages.map((item, index) => (
            <div className={`${styles.playerBubbleRow} ${item.role === "user" ? styles.playerBubbleUser : ""}`} key={`${item.role}-${index}`}>
              <div className={styles.playerBubble}>
                <ChatMessageContent message={item} streaming={sending && index === messages.length - 1 && item.role === "assistant"} />
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles.playerChatComposer}>
        <Input.TextArea
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={sending}
          onChange={(event) => setInputValue(event.target.value)}
          onPressEnter={(event) => {
            if (!event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder="输入你的问题…"
          value={inputValue}
        />
        <Button type="primary" icon={<SendOutlined />} loading={sending} onClick={() => void submit()} />
      </div>
      <Drawer
        title="对话历史"
        placement="right"
        width="88vw"
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      >
        {loadingHistory ? <Spin /> : null}
        {!loadingHistory && sessions.length === 0 ? <Empty description="暂无历史对话" /> : null}
        <div className={styles.mobileHistoryList}>
          {sessions.map((session) => (
            <div className={styles.mobileHistoryItem} key={session.threadId}>
              <button type="button" onClick={() => void loadSession(session.threadId)}>
                <strong>{session.title}</strong>
                <span>{session.scene || "对话"} · {formatChatTime(session.updatedAt)}</span>
                {loadingThreadId === session.threadId ? <small>加载中...</small> : null}
              </button>
              <Button
                danger
                size="small"
                type="text"
                icon={<DeleteOutlined />}
                onClick={() => void removeSession(session.threadId)}
              />
            </div>
          ))}
        </div>
      </Drawer>
      <Modal
        title="转人工"
        open={humanModalOpen}
        onCancel={() => setHumanModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setHumanModalOpen(false)}>知道了</Button>,
        ]}
      >
        <p>当前版本先采用人工半自动流程：请复制你的问题或预约码，私聊店家核验。</p>
        {threadId ? <p>当前会话：{threadId}</p> : null}
        <p>后续可以在这里接入企业微信、工单或店员后台待处理列表。</p>
      </Modal>
    </section>
  );
}

export function PlayerChat() {
  return (
    <Suspense fallback={null}>
      <PlayerChatInner />
    </Suspense>
  );
}
