"use client";

/* eslint-disable @next/next/no-img-element -- 场次图片来自 OSS 临时/外部地址，暂不接 Next Image 域名白名单。 */
import Link from "next/link";
import styles from "./session-car-card.module.css";

export type SessionCarCardData = {
  id: string;
  title: string;
  scriptName: string;
  startTime: string;
  durationMinutes: number;
  capacity: number;
  joinedSeats: number;
  priceCents: number;
  status?: string;
  dmName?: string | null;
  roomName?: string | null;
  coverImageUrl?: string | null;
  joinStatus?: string | null;
  reservationCode?: string | null;
};

function formatPrice(value: number) {
  return value ? `¥${Math.round(value / 100)} /人` : "到店咨询";
}

function formatSessionTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusText(status?: string | null) {
  if (status === "cancelled") return "已取消";
  if (status === "completed") return "已结束";
  if (status === "full") return "已满";
  return "报名中";
}

function joinText(status?: string | null) {
  if (status === "cancelled") return "已取消预约";
  if (status === "confirmed") return "已上车";
  if (status === "pending") return "待确认";
  return null;
}

export function SessionCarCard({
  session,
  href,
  compact = false,
}: {
  session: SessionCarCardData;
  href?: string;
  compact?: boolean;
}) {
  const remainingSeats = Math.max(session.capacity - session.joinedSeats, 0);
  const percent = Math.min(Math.round((session.joinedSeats / Math.max(session.capacity, 1)) * 100), 100);
  const carRate = remainingSeats <= 1 ? "极高" : remainingSeats <= 3 ? "高" : "中";
  const content = (
    <article className={`${styles.card} ${compact ? styles.compact : ""}`}>
      <div className={styles.cover}>
        {session.coverImageUrl ? <img src={session.coverImageUrl} alt={session.title || session.scriptName} /> : <span className={styles.placeholder}>{session.scriptName.slice(0, 2)}</span>}
        <em className={styles.badge}>{statusText(session.status)}</em>
      </div>
      <div className={styles.main}>
        <div className={styles.topLine}>
          <h3>{session.title || session.scriptName}</h3>
          <span className={styles.rate}>拼成率<em>{carRate}</em></span>
        </div>
        <p className={styles.meta}>
          {session.scriptName} · {session.roomName || "房间待定"} · {session.dmName ? `DM ${session.dmName}` : "DM 待定"} · {Math.round(session.durationMinutes / 60)}小时
        </p>
        <strong className={styles.price}>{formatPrice(session.priceCents)}</strong>
        <div className={styles.footer}>
          <small>{formatSessionTime(session.startTime)}</small>
          <b>{joinText(session.joinStatus) ?? (remainingSeats > 0 ? `等${remainingSeats}人` : "已满")}</b>
        </div>
        {session.reservationCode ? <p className={styles.meta}>预约码：{session.reservationCode}</p> : null}
        <div className={styles.progress}>
          <div className={styles.progressBar} style={{ width: `${percent}%` }} />
        </div>
      </div>
    </article>
  );

  return href ? <Link href={href} className={styles.link}>{content}</Link> : content;
}
