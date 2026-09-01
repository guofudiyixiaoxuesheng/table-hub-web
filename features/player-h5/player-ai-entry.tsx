"use client";

import { Button, Input } from "antd";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import styles from "./player-mobile-shell.module.css";

function PlayerAiEntryInner() {
  const searchParams = useSearchParams();
  const question = useMemo(() => searchParams.get("question") ?? "", [searchParams]);
  const goLogin = () => {
    const next = `/p/ai${question ? `?question=${encodeURIComponent(question)}` : ""}`;
    window.location.assign(`/login?next=${encodeURIComponent(next)}`);
  };

  return (
    <>
      <section className={styles.hero}>
        <p className={styles.storeLabel}>AI 客服</p>
        <h1>先问一句，别干等</h1>
        <p className={styles.heroText}>这里后续可以直接接当前 LangGraph 对话接口，用于剧本推荐、拼车咨询和门店规则问答。</p>
      </section>
      <section className={`${styles.section} ${styles.plainCard}`} style={{ padding: 14 }}>
        <Input.TextArea
          autoSize={{ minRows: 4, maxRows: 7 }}
          value={question || "例如：周六有没有能拼的欢乐本？"}
          readOnly
        />
        <Button block type="primary" size="large" style={{ marginTop: 12 }} onClick={goLogin}>
          登录后开始咨询
        </Button>
      </section>
    </>
  );
}

export function PlayerAiEntry() {
  return (
    <Suspense fallback={null}>
      <PlayerAiEntryInner />
    </Suspense>
  );
}
