"use client";

import { DatePicker, Input, Skeleton } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { listPublicGameSessions, type PublicGameSession } from "@/lib/player-h5/player-public-api";
import { MobileSessionCard } from "./mobile-cards";
import { todayValue } from "./mobile-format";
import styles from "./player-mobile-shell.module.css";

export function PlayerSessionList() {
  const [keyword, setKeyword] = useState("");
  const [day, setDay] = useState(todayValue());
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PublicGameSession[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      listPublicGameSessions({ keyword, day, status: "recruiting" })
        .then(setItems)
        .catch((reason) => {
          setItems([]);
          setError(reason instanceof Error ? reason.message : "场次数据加载失败");
        })
        .finally(() => setLoading(false));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [keyword, day]);

  return (
    <>
      <section className={styles.hero}>
        <p className={styles.storeLabel}>活动组局</p>
        <h1>今天想上哪一车？</h1>
        <p className={styles.heroText}>按剧本资料和门店场次展示可拼车活动，选好后登录即可预约并生成核验码。</p>
      </section>
      <div className={styles.filterRow}>
        <Input.Search allowClear placeholder="搜索剧本/场次" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
        <DatePicker
          allowClear={false}
          value={dayjs(day)}
          onChange={(value) => setDay(value?.format("YYYY-MM-DD") ?? todayValue())}
          style={{ minWidth: 128 }}
        />
      </div>
      {loading ? <Skeleton active /> : null}
      {!loading && error ? <div className={styles.empty}>{error}</div> : null}
      {!loading && !error && items.length === 0 ? <div className={styles.empty}>当天暂无可拼场次。</div> : null}
      <div className={styles.cardList}>
        {items.map((session) => (
          <MobileSessionCard key={session.id} session={session} />
        ))}
      </div>
    </>
  );
}
