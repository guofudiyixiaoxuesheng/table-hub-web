"use client";

import { UserOutlined } from "@ant-design/icons";
import { Button, Form, Input, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { PhoneField, SmsCodeField } from "./auth-form-fields";
import styles from "./login-panel.module.css";

type SmsLoginValues = {
  phone: string;
  code: string;
  nickname?: string;
};

export function SmsLoginForm() {
  const [form] = Form.useForm<SmsLoginValues>();
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const sendCode = async () => {
    try {
      await form.validateFields(["phone"]);
      setSending(true);
      messageApi.info("短信服务还未接入供应商，当前先保留验证码登录入口");
      setCountdown(10);
    } finally {
      setSending(false);
    }
  };

  return (
    <Form form={form} layout="vertical" size="large" requiredMark={false}>
      {contextHolder}
      <Form.Item label="称呼（可选）" name="nickname">
        <Input prefix={<UserOutlined />} placeholder="首次登录可填写，例如：小陆" />
      </Form.Item>
      <PhoneField />
      <Form.Item
        label="验证码"
        required
        className={styles.codeFormItem}
      >
        <div className={styles.codeRow}>
          <Form.Item
            name="code"
            noStyle
            rules={[
              { required: true, message: "请输入验证码" },
              { pattern: /^\d{4,8}$/, message: "验证码格式不正确" },
            ]}
          >
            <SmsCodeField />
          </Form.Item>
        <Button onClick={() => void sendCode()} loading={sending} disabled={countdown > 0}>
          {countdown > 0 ? `${countdown}s` : "获取验证码"}
        </Button>
        </div>
      </Form.Item>
      <div className={styles.formMeta}>
        <Typography.Text type="secondary">验证码登录不需要密码；登录后可在「我的 / 账户安全」里设置密码。</Typography.Text>
      </div>
      <Button type="primary" block size="large" disabled>快速登录 / 注册</Button>
    </Form>
  );
}
