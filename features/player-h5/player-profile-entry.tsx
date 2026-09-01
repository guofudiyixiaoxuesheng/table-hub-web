"use client";

import { Button } from "antd";
import { useAuth } from "@/features/auth/auth-provider";
import styles from "./player-mobile-shell.module.css";

export function PlayerProfileEntry() {
  const { user } = useAuth();
  const navigate = () => {
    window.location.assign(user ? "/me" : "/login?next=/p/me");
  };

  return (
    <>
      <section className={styles.profileCard}>
        <p>{user ? "已登录玩家" : "还没有登录"}</p>
        <h1>{user?.nickname || user?.phone || "登录后查看我的预约"}</h1>
        <p>玩家端未来会展示我的预约码、历史拼车、偏好标签和常用联系方式。</p>
        <Button type="primary" size="large" onClick={navigate}>
          {user ? "查看账号资料" : "手机号登录 / 注册"}
        </Button>
      </section>
      <section className={`${styles.section} ${styles.plainCard}`} style={{ padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>我的预约</h2>
        <div className={styles.empty}>预约提交接口接入后，这里会显示预约码和核验状态。</div>
      </section>
    </>
  );
}
