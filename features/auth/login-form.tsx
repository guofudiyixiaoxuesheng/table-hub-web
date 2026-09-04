"use client";

import { Button, Form, Typography } from "antd";
import { useState } from "react";
import { useAuth } from "./auth-provider";
import { PasswordField, PhoneField } from "./auth-form-fields";
import styles from "./login-panel.module.css";

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, loading } = useAuth();

  const submit = async (values: { phone: string; password: string }) => {
    setSubmitting(true);
    setError(null);
    try {
      await login(values.phone, values.password);
      onSuccess();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "登录失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form layout="vertical" size="large" requiredMark={false} onFinish={submit}>
      <PhoneField />
      <PasswordField />
      <div className={styles.formMeta}><Typography.Text type="secondary">适合已有密码的店长、DM 或老用户</Typography.Text></div>
      {error && <Typography.Paragraph type="danger" className={styles.error}>{error}</Typography.Paragraph>}
      <Button type="primary" htmlType="submit" block size="large" loading={submitting || loading}>手机号密码登录</Button>
    </Form>
  );
}
