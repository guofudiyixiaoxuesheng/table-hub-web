"use client";

import { Button, Skeleton } from "antd";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getPublicStore,
  listPublicGameSessions,
  listPublicScripts,
  type PublicGameSession,
  type PublicScript,
  type PublicStore,
} from "@/lib/player-h5/player-public-api";
import { MobileScriptCard, MobileSessionCard } from "./mobile-cards";
import { todayValue } from "./mobile-format";
import styles from "./player-mobile-shell.module.css";

export function PlayerHome() {
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<PublicStore | null>(null);
  const [sessions, setSessions] = useState<PublicGameSession[]>([]);
  const [scripts, setScripts] = useState<PublicScript[]>([]);
  const [homeError, setHomeError] = useState<string | null>(null);
  const navigate = (href: string) => {
    window.location.assign(href);
  };

  useEffect(() => {
    let alive = true;
    Promise.allSettled([
      getPublicStore(),
      listPublicGameSessions({ day: todayValue(), status: "recruiting" }),
      listPublicScripts(),
    ])
      .then(([storeResult, sessionResult, scriptResult]) => {
        if (!alive) return;
        if (storeResult.status === "fulfilled") setStore(storeResult.value);
        if (sessionResult.status === "fulfilled") setSessions(sessionResult.value.slice(0, 3));
        if (scriptResult.status === "fulfilled") setScripts(scriptResult.value.slice(0, 4));
        if (sessionResult.status === "rejected" && scriptResult.status === "rejected") {
          setHomeError("暂时连不上后端服务，请确认电脑后端已用 0.0.0.0:8000 启动。");
        }
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <p className={styles.storeLabel}>{store?.name ?? "TableHub 门店"}</p>
            <h1>今天想玩点什么？</h1>
          </div>
          <Button size="small" type="primary" onClick={() => navigate("/login?next=/p")}>
            登录
          </Button>
        </div>
        <p className={styles.heroText}>看剧本、找拼车、问 AI 客服。老板后台上新的剧本和场次，会自动同步到这个玩家入口。</p>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>今日可拼</h2>
          <Link className={styles.link} href="/p/sessions">
            全部场次
          </Link>
        </div>
        {loading ? <Skeleton active /> : null}
        {!loading && homeError ? <div className={styles.empty}>{homeError}</div> : null}
        {!loading && !homeError && sessions.length === 0 ? <div className={styles.empty}>今天暂无可拼场次，可以问问 AI 客服推荐。</div> : null}
        <div className={styles.cardList}>
          {sessions.map((session) => (
            <MobileSessionCard key={session.id} session={session} />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>热门剧本</h2>
          <Link className={styles.link} href="/p/scripts">
            剧本库
          </Link>
        </div>
        <div className={styles.cardList}>
          {scripts.map((script) => (
            <MobileScriptCard key={script.id} script={script} />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>快捷咨询</h2>
        </div>
        <div className={styles.quickGrid}>
          {["周末有什么本能拼？", "新手适合玩什么？", "恐怖本推荐一下", "DM 开本流程咨询"].map((text) => (
            <Link className={styles.quickButton} href={`/p/ai?question=${encodeURIComponent(text)}`} key={text}>
              {text}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
