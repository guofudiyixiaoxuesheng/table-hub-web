"use client";

import { LockOutlined, MobileOutlined, ThunderboltFilled } from "@ant-design/icons";
import { Button, Checkbox, Form, Input, Typography } from "antd";
import Link from "next/link";
import styles from "./login-panel.module.css";

export function LoginPanel() {
  return (
    <main className={styles.page}>
      <section className={styles.story}>
        <div className={styles.storyContent}>
          <span className={styles.logo}><ThunderboltFilled /></span>
          <p className={styles.eyebrow}>TABLEHUB · STORE OS</p>
          <h1>让每一次咨询，<br />都自然走向到店。</h1>
          <p>AI 承接重复问答，场次、预约和客户统一管理。把时间留给真正重要的体验。</p>
          <div className={styles.signal}><i /><span>AI 客服与门店系统运行正常</span></div>
        </div>
      </section>
      <section className={styles.formSide}>
        <div className={styles.mobileBrand}><span><ThunderboltFilled /></span>TableHub</div>
        <div className={styles.formCard}>
          <Typography.Title level={2}>欢迎回来</Typography.Title>
          <Typography.Paragraph type="secondary">登录门店工作台，继续今天的运营。</Typography.Paragraph>
          <Form layout="vertical" size="large" requiredMark={false}>
            <Form.Item label="手机号" name="phone" rules={[{ required: true, message: "请输入手机号" }]}>
              <Input prefix={<MobileOutlined />} placeholder="请输入登录手机号" />
            </Form.Item>
            <Form.Item label="密码" name="password" rules={[{ required: true, message: "请输入密码" }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
            </Form.Item>
            <div className={styles.formMeta}><Checkbox>记住登录状态</Checkbox><Button type="link">忘记密码？</Button></div>
            <Link href="/chat"><Button type="primary" block size="large">登录工作台</Button></Link>
          </Form>
          <p className={styles.help}>首次使用？请联系平台管理员开通门店账号</p>
        </div>
      </section>
    </main>
  );
}
