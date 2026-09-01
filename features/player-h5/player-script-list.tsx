"use client";

import { Button, Input, Segmented, Skeleton } from "antd";
import { useEffect, useState } from "react";
import { listPublicScripts, type PublicScript } from "@/lib/player-h5/player-public-api";
import { SCRIPT_GENRE_OPTIONS, type ScriptGenre } from "@/lib/oss/knowledge-resource-types";
import { MobileScriptCard } from "./mobile-cards";
import styles from "./player-mobile-shell.module.css";

export function PlayerScriptList() {
  const [keyword, setKeyword] = useState("");
  const [genre, setGenre] = useState<ScriptGenre | undefined>();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PublicScript[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      listPublicScripts({ keyword, scriptGenre: genre })
        .then(setItems)
        .catch((reason) => {
          setItems([]);
          setError(reason instanceof Error ? reason.message : "剧本数据加载失败");
        })
        .finally(() => setLoading(false));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [keyword, genre]);

  return (
    <>
      <section className={styles.hero}>
        <p className={styles.storeLabel}>玩家剧本库</p>
        <h1>找一个今晚想进入的故事</h1>
        <p className={styles.heroText}>这里展示后台知识库中类型为“剧本”的资源，后续可继续接 RAG 问答和详情推荐。</p>
      </section>
      <div className={styles.filterRow}>
        <Input.Search allowClear placeholder="搜索剧本名" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
        <Button onClick={() => setGenre(undefined)}>全部类型</Button>
      </div>
      <Segmented
        block
        className={styles.genreSegmented}
        options={SCRIPT_GENRE_OPTIONS.map((item) => ({ label: item.label.replace("本", ""), value: item.value }))}
        value={genre}
        onChange={(value) => setGenre(value as ScriptGenre)}
      />
      {loading ? <Skeleton active /> : null}
      {!loading && error ? <div className={styles.empty}>{error}</div> : null}
      {!loading && items.length === 0 ? <div className={styles.empty}>暂时没有找到匹配剧本。</div> : null}
      <div className={styles.cardList}>
        {items.map((script) => (
          <MobileScriptCard key={script.id} script={script} />
        ))}
      </div>
    </>
  );
}
