"use client";

import { XMarkdown } from "@ant-design/x-markdown";
import type { ChatMessage } from "@/lib/chat/chat-api";
import styles from "./chat-message-content.module.css";

type ChatMessageContentProps = {
  message: ChatMessage;
  streaming?: boolean;
};

export function ChatMessageContent({ message, streaming = false }: ChatMessageContentProps) {
  if (message.role === "user") {
    return <span className={styles.userText}>{message.content}</span>;
  }

  return (
    <XMarkdown
      content={message.content}
      className={styles.markdown}
      openLinksInNewTab
      escapeRawHtml
      streaming={{
        hasNextChunk: streaming,
        // 微信 WebView / 移动端 H5 对块状 tail 字符的字体 fallback 不稳定，
        // 容易出现过粗、错位的“思考中光标”。这里保留流式 Markdown 缓存，
        // 但不额外渲染光标动画，兼容性更稳。
        enableAnimation: false,
        tail: false,
      }}
    />
  );
}
