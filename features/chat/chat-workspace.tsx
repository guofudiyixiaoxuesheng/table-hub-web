"use client";

import { useState } from "react";
import { PlusOutlined, SendOutlined, ThunderboltFilled } from "@ant-design/icons";
import { Avatar, Button, Input, Tag } from "antd";
import styles from "./chat-workspace.module.css";

const quickQuestions = ["推荐适合新手的 6 人本", "周六还有哪些空场？", "退款规则是什么？"];

export function ChatWorkspace() {
  const [message, setMessage] = useState("");

  return (
    <section className={styles.workspace}>
      <aside className={styles.history}>
        <Button type="primary" block icon={<PlusOutlined />}>新建对话</Button>
        <span className={styles.historyLabel}>最近对话</span>
        {[
          ["新手剧本推荐", "刚刚"],
          ["周末场次安排", "昨天"],
          ["预约退款规则", "8月24日"],
        ].map(([title, time], index) => (
          <button key={title} type="button" className={`${styles.historyItem} ${index === 0 ? styles.active : ""}`}>
            <span>{title}</span><small>{time}</small>
          </button>
        ))}
      </aside>

      <div className={styles.chatPanel}>
        <div className={styles.chatHeader}>
          <div className={styles.aiIdentity}>
            <Avatar icon={<ThunderboltFilled />} style={{ background: "#6d5dfc" }} />
            <span><strong>TableHub AI</strong><small>门店知识库已连接 · 3 个有效文档</small></span>
          </div>
          <Tag color="success">在线</Tag>
        </div>

        <div className={styles.messages}>
          <div className={styles.welcome}>
            <span className={styles.welcomeIcon}><ThunderboltFilled /></span>
            <h2>今天想了解什么？</h2>
            <p>我可以帮你回答门店规则、推荐剧本、查询场次，也能协助整理客户咨询。</p>
            <div className={styles.quickQuestions}>
              {quickQuestions.map((question) => <Button key={question} onClick={() => setMessage(question)}>{question}</Button>)}
            </div>
          </div>
        </div>

        <div className={styles.composer}>
          <Input.TextArea value={message} onChange={(event) => setMessage(event.target.value)} autoSize={{ minRows: 1, maxRows: 4 }} placeholder="输入问题，按 Enter 发送…" />
          <Button type="primary" shape="circle" icon={<SendOutlined />} aria-label="发送消息" />
        </div>
      </div>
    </section>
  );
}
