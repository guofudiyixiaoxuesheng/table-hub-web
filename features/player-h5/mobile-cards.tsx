"use client";

import { Tag } from "antd";
import type { PublicGameSession, PublicScript } from "@/lib/player-h5/player-public-api";
import { SCRIPT_GENRE_OPTIONS } from "@/lib/oss/knowledge-resource-types";
import { formatPrice, formatSessionTime } from "./mobile-format";
import styles from "./player-mobile-shell.module.css";

const genreMap = Object.fromEntries(SCRIPT_GENRE_OPTIONS.map((item) => [item.value, item.label]));

export function MobileSessionCard({ session }: { session: PublicGameSession }) {
  const percent = Math.min(Math.round((session.joinedSeats / Math.max(session.capacity, 1)) * 100), 100);
  const remainingSeats = Math.max(session.capacity - session.joinedSeats, 0);
  return (
    <article className={styles.sessionCard}>
      <div className={styles.cardTitle}>
        <strong>{session.title || session.scriptName}</strong>
        <Tag color={remainingSeats > 0 ? "green" : "default"}>
          {remainingSeats > 0 ? `余 ${remainingSeats}` : "已满"}
        </Tag>
      </div>
      <div className={styles.meta}>
        {session.scriptName} · {formatSessionTime(session.startTime)} · {formatPrice(session.priceCents)}
      </div>
      <div className={styles.progress}>
        <div className={styles.progressBar} style={{ width: `${percent}%` }} />
      </div>
      <div className={styles.meta}>
        已拼 {session.joinedSeats}/{session.capacity} 人
        {session.dmName ? ` · DM：${session.dmName}` : ""}
      </div>
    </article>
  );
}

export function MobileScriptCard({ script }: { script: PublicScript }) {
  return (
    <article className={styles.scriptCard}>
      <div className={styles.cardTitle}>
        <strong>{script.name}</strong>
        {script.scriptGenre ? <Tag color="purple">{genreMap[script.scriptGenre] ?? script.scriptGenre}</Tag> : null}
      </div>
      {script.description ? <p className={styles.desc}>{script.description}</p> : null}
      {script.tags?.length ? (
        <div style={{ marginTop: 10 }}>
          {script.tags.slice(0, 4).map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
      ) : null}
    </article>
  );
}
