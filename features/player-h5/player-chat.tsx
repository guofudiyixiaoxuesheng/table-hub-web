"use client";

import { SendOutlined, ThunderboltFilled } from "@ant-design/icons";
import { Avatar, Button, Input, Space, message as antdMessage } from "antd";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import {
  getGuestId,
  streamChatMessage,
  type ChatMessage,
} from "@/lib/chat/chat-api";
import { ChatMessageContent } from "@/features/chat/components/chat-message-content";
import styles from "./player-mobile-shell.module.css";

const quickQuestions = ["周六有没有能拼的剧本？", "推荐新手 6 人本", "恐怖本适合几个人？"];

function PlayerChatInner() {
  const searchParams = useSearchParams();
  const initialQuestion = useMemo(() => searchParams.get("question") ?? "", [searchParams]);
  const [inputValue, setInputValue] = useState(initialQuestion);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [messageApi, contextHolder] = antdMessage.useMessage();

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
        <Avatar icon={<ThunderboltFilled />} style={{ background: "#6d5dfc" }} />
        <div>
          <strong>TableHub AI 客服</strong>
          <span>{threadId ? `会话 ${threadId.slice(0, 8)}...` : "可咨询剧本、拼车和门店规则"}</span>
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
