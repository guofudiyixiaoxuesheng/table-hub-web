"use client";

import { Tag } from "antd";
import type { PublicGameSession, PublicScript } from "@/lib/player-h5/player-public-api";
import { SCRIPT_GENRE_OPTIONS } from "@/lib/oss/knowledge-resource-types";
import { SessionCarCard } from "@/features/sessions/session-car-card";
import styles from "./player-mobile-shell.module.css";

const genreMap = Object.fromEntries(SCRIPT_GENRE_OPTIONS.map((item) => [item.value, item.label]));

export function MobileSessionCard({ session }: { session: PublicGameSession }) {
  return (
    <SessionCarCard session={session} href={`/p/sessions/${session.id}`} />
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
