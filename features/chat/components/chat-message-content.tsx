"use client";

import { XMarkdown } from "@ant-design/x-markdown";
import { CalendarOutlined, TeamOutlined } from "@ant-design/icons";
import { Button } from "antd";
import type { ChatMessage } from "@/lib/chat/chat-api";
import styles from "./chat-message-content.module.css";

export type CarpoolSessionCandidate = {
  id: string;
  scriptName: string;
  title?: string | null;
  startTime: string;
  remainingSeats: number;
  priceCents: number;
};

type ChatMessageContentProps = {
  message: ChatMessage;
  streaming?: boolean;
  onReserve?: (session: CarpoolSessionCandidate) => void;
};

function carpoolCandidates(metadata: ChatMessage["metadata"]): CarpoolSessionCandidate[] {
  const payload = metadata?.scenePayload;
  if (!payload || typeof payload !== "object") return [];
  const sessions = (payload as { sessions?: unknown }).sessions;
  if (!Array.isArray(sessions)) return [];
  return sessions.filter((item): item is CarpoolSessionCandidate => (
    Boolean(item) && typeof item === "object" && typeof (item as { id?: unknown }).id === "string"
  ));
}

function formatStartTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function ChatMessageContent({ message, streaming = false, onReserve }: ChatMessageContentProps) {
  if (message.role === "user") {
    return <span className={styles.userText}>{message.content}</span>;
  }

  const candidates = carpoolCandidates(message.metadata);
  return (
    <>
      <XMarkdown
        content={message.content}
        className={styles.markdown}
        openLinksInNewTab
        escapeRawHtml
        streaming={{
          hasNextChunk: streaming,
          enableAnimation: false,
          tail: false,
        }}
      />
      {candidates.length > 0 && onReserve ? (
        <div className={styles.carpoolCandidates}>
          <div className={styles.carpoolCandidatesHeader}>
            <span>可拼场次</span>
            <small>选好后确认人数即可上车</small>
          </div>
          {candidates.map((session, index) => (
            <div className={styles.carpoolCandidate} key={session.id}>
              <span className={styles.carpoolCandidateIndex}>{String(index + 1).padStart(2, "0")}</span>
              <div className={styles.carpoolCandidateBody}>
                <div className={styles.carpoolCandidateTitleRow}>
                  <strong>{session.scriptName}</strong>
                  <span className={styles.carpoolRecruitingTag}>招募中</span>
                </div>
                {session.title && session.title !== session.scriptName ? <p>{session.title}</p> : null}
                <div className={styles.carpoolCandidateMeta}>
                  <span><CalendarOutlined /> {formatStartTime(session.startTime)}</span>
                  <span><TeamOutlined /> 余 {session.remainingSeats} 位</span>
                  <b>{session.priceCents ? `¥${session.priceCents / 100}` : "价格待确认"}</b>
                </div>
              </div>
              <Button type="primary" onClick={() => onReserve(session)}>选这车</Button>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
