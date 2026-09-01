"use client";

import { useEffect, useMemo, useState } from "react";
import { DeleteOutlined, MessageOutlined, ThunderboltFilled } from "@ant-design/icons";
import type { BubbleItemType, ConversationItemType } from "@ant-design/x";
import { Bubble, Conversations, Sender, Welcome } from "@ant-design/x";
import { Avatar, Button, Space, Spin, Tag, message as antdMessage } from "antd";
import { useAuth } from "@/features/auth/auth-provider";
import {
  deleteChatSession,
  getChatSessionMessages,
  getGuestId,
  listChatSessions,
  streamChatMessage,
  type ChatMessage,
  type ChatSessionSummary,
} from "@/lib/chat/chat-api";
import { ChatMessageContent } from "./components/chat-message-content";
import styles from "./chat-workspace.module.css";

const quickQuestions = ["推荐适合新手的 6 人本", "周六还有哪些空场？", "DM 开本第一幕应该注意什么？"];
const sceneLabels: Record<string, string> = {
  carpool: "拼车",
  script_rag: "剧本",
  reservation: "预约",
  store_faq: "客服",
  casual_chat: "闲聊",
  fallback: "兜底",
};

function formatTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function sessionLabel(session: ChatSessionSummary) {
  return (
    <span className={styles.conversationLabel}>
      <span className={styles.conversationTitle}>{session.title}</span>
      <small>{sceneLabels[session.scene ?? ""] ?? "对话"} · {formatTime(session.updatedAt)}</small>
    </span>
  );
}

export function ChatWorkspace() {
  const [inputValue, setInputValue] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingThreadId, setLoadingThreadId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [messageApi, contextHolder] = antdMessage.useMessage();
  const { loading: authLoading } = useAuth();

  const refreshSessions = async (ownerGuestId = getGuestId()) => {
    setLoadingSessions(true);
    try {
      setSessions(await listChatSessions(ownerGuestId));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "加载对话历史失败");
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    // 等 AuthProvider 刷新 access token 后再拉历史，避免登录用户被当成游客查询。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  const conversationItems = useMemo<ConversationItemType[]>(
    () => sessions.map((session) => ({
      key: session.threadId,
      label: sessionLabel(session),
      icon: <MessageOutlined />,
      session,
    })),
    [sessions],
  );

  const bubbleItems = useMemo<BubbleItemType[]>(
    () => messages.map((item, index) => ({
      key: `${item.role}-${index}`,
      role: item.role === "user" ? "user" : "ai",
      content: <ChatMessageContent message={item} streaming={sending && index === messages.length - 1 && item.role === "assistant"} />,
      typing: index === messages.length - 1 && item.role === "assistant" ? { effect: "typing", step: 4, interval: 20 } : false,
    })),
    [messages, sending],
  );

  const createSession = () => {
    setThreadId(null);
    setMessages([]);
    setInputValue("");
  };

  const submitMessage = async (value = inputValue) => {
    const content = value.trim();
    if (!content || sending || authLoading) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", messageType: "text", content }];
    setMessages(nextMessages);
    setInputValue("");
    setSending(true);
    try {
      setMessages([...nextMessages, { role: "assistant", messageType: "text", content: "正在理解你的问题…" }]);
      const result = await streamChatMessage(content, {
        threadId,
        guestId: getGuestId(),
        streamMode: "updates",
        onEvent: (event) => {
          if (event.event === "session") {
            setThreadId(event.data.threadId);
            return;
          }
          if (event.event === "update") {
            setMessages((current) => {
              const copy = [...current];
              const lastIndex = copy.length - 1;
              const state = event.data.state as { scene?: string; answer?: string } | undefined;
              if (copy[lastIndex]?.role === "assistant") {
                const currentContent = copy[lastIndex].content;
                const hasStartedStreaming = currentContent && !currentContent.startsWith("正在") && !currentContent.startsWith("已识别场景");
                if (hasStartedStreaming) return copy;
                copy[lastIndex] = {
                  ...copy[lastIndex],
                  content: state?.answer || (state?.scene ? `已识别场景：${sceneLabels[state.scene] ?? state.scene}，正在组织回答…` : "正在检索上下文…"),
                };
              }
              return copy;
            });
            return;
          }
          if (event.event === "delta") {
            setMessages((current) => {
              const copy = [...current];
              const lastIndex = copy.length - 1;
              if (copy[lastIndex]?.role === "assistant") {
                const currentContent = copy[lastIndex].content;
                const shouldReplace = currentContent.startsWith("正在") || currentContent.startsWith("已识别场景");
                copy[lastIndex] = {
                  ...copy[lastIndex],
                  content: `${shouldReplace ? "" : currentContent}${event.data.delta}`,
                };
              }
              return copy;
            });
            return;
          }
          if (event.event === "state") {
            setMessages((current) => {
              const copy = [...current];
              const lastIndex = copy.length - 1;
              const state = event.data as { scene?: string; answer?: string };
              if (copy[lastIndex]?.role === "assistant") {
                const currentContent = copy[lastIndex].content;
                const hasStartedStreaming = currentContent && !currentContent.startsWith("正在") && !currentContent.startsWith("已识别场景");
                if (hasStartedStreaming) return copy;
                copy[lastIndex] = {
                  ...copy[lastIndex],
                  content: state.answer || (state.scene ? `已识别场景：${sceneLabels[state.scene] ?? state.scene}，正在组织回答…` : "正在推进父图…"),
                };
              }
              return copy;
            });
          }
        },
      });
      if (!result?.threadId) throw new Error("AI 对话接口返回异常：缺少 threadId");
      setThreadId(result.threadId);
      setMessages([...nextMessages, { role: "assistant", messageType: "text", content: result.answer, metadata: { scene: result.scene } }]);
      void refreshSessions();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "发送失败");
      setMessages(messages);
    } finally {
      setSending(false);
    }
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

  return (
    <section className={styles.workspace}>
      {contextHolder}
      <aside className={styles.history}>
        <Conversations
          activeKey={threadId ?? undefined}
          items={conversationItems}
          onActiveChange={(key) => void loadSession(key)}
          creation={{ onClick: createSession, label: "新建对话" }}
          menu={(item) => ({
            items: [{ key: "delete", label: "删除", danger: true, icon: <DeleteOutlined /> }],
            onClick: ({ domEvent }) => {
              domEvent.stopPropagation();
              void removeSession(item.key);
            },
          })}
          className={styles.conversations}
        />
        {loadingSessions ? <Spin className={styles.historySpin} /> : null}
      </aside>

      <div className={styles.chatPanel}>
        <div className={styles.chatHeader}>
          <div className={styles.aiIdentity}>
            <Avatar icon={<ThunderboltFilled />} style={{ background: "#6d5dfc" }} />
            <span><strong>TableHub AI</strong><small>{threadId ? `当前会话 ${threadId.slice(0, 12)}...` : "父图已连接 · 可进入 DM/预约/客服分支"}</small></span>
          </div>
          <Tag color={authLoading || loadingThreadId ? "processing" : "success"}>{authLoading ? "认证中" : loadingThreadId ? "加载中" : threadId ? "会话中" : "在线"}</Tag>
        </div>

        <div className={styles.messages}>
          {messages.length === 0 ? (
            <Welcome
              title={(
                <div className={styles.welcomeCard}>
                  <div className={styles.welcomeTitleRow}>
                    <span className={styles.welcomeIcon}><ThunderboltFilled /></span>
                    <div>
                      <h2>今天想了解什么？</h2>
                      <span>TableHub AI 已就绪</span>
                    </div>
                  </div>
                  <Space wrap className={styles.quickQuestions}>
                    {quickQuestions.map((question) => (
                      <Button key={question} onClick={() => void submitMessage(question)}>
                        {question}
                      </Button>
                    ))}
                  </Space>
                  <p className={styles.welcomeTips}>Tips：可以直接问“捉小三 DM 开本流程是什么”，我会先识别场景，再走对应的 RAG 子图。</p>
                </div>
              )}
              className={styles.welcome}
            />
          ) : (
            <Bubble.List
              items={bubbleItems}
              autoScroll
              className={styles.bubbleList}
              role={{
                user: { placement: "end", variant: "filled", shape: "corner" },
                ai: { placement: "start", variant: "outlined", shape: "corner", avatar: <Avatar icon={<ThunderboltFilled />} style={{ background: "#6d5dfc" }} /> },
              }}
            />
          )}
        </div>

        <div className={styles.composer}>
          <Sender
            value={inputValue}
            loading={sending || authLoading}
            placeholder="输入问题，按 Enter 发送，Shift + Enter 换行…"
            autoSize={{ minRows: 1, maxRows: 4 }}
            onChange={setInputValue}
            onSubmit={(value) => void submitMessage(value)}
            onCancel={() => setSending(false)}
          />
        </div>
      </div>
    </section>
  );
}
