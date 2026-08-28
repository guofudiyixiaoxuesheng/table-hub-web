"use client";

import { KeyOutlined, ShopOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Form, Input, Segmented, Typography } from "antd";
import { useState } from "react";
import { useAuth } from "./auth-provider";
import { PasswordField, PhoneField } from "./auth-form-fields";
import styles from "./login-panel.module.css";

type RegisterValues = {
  registrationType: "user" | "store" | "dm";
  phone: string;
  password: string;
  confirmPassword: string;
  nickname: string;
  storeName?: string;
  inviteCode?: string;
};

export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [form] = Form.useForm<RegisterValues>();
  const registrationType = Form.useWatch("registrationType", form) ?? "user";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register } = useAuth();

  const submit = async (values: RegisterValues) => {
    setSubmitting(true);
    setError(null);
    try {
      await register({
        phone: values.phone,
        password: values.password,
        nickname: values.nickname,
        registrationType: values.registrationType,
        storeName: values.storeName,
        inviteCode: values.inviteCode,
      });
      onSuccess();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "注册失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form form={form} layout="vertical" size="large" requiredMark={false} onFinish={submit} initialValues={{ registrationType: "user" }}>
      <Form.Item name="registrationType">
        <Segmented block options={[{ label: "普通用户", value: "user" }, { label: "注册门店", value: "store" }, { label: "DM", value: "dm" }]} />
      </Form.Item>
      {registrationType === "store" && (
        <Form.Item label="门店名称" name="storeName" rules={[{ required: true, message: "请输入门店名称" }]}>
          <Input prefix={<ShopOutlined />} placeholder="例如：北岸桌游店" />
        </Form.Item>
      )}
      {registrationType === "dm" && (
        <Form.Item label="门店邀请码" name="inviteCode" rules={[{ required: true, message: "请输入店长提供的邀请码" }]}>
          <Input prefix={<KeyOutlined />} placeholder="请输入一次性 DM 邀请码" maxLength={32} />
        </Form.Item>
      )}
      <Form.Item label="称呼" name="nickname" rules={[{ required: true, message: "请输入称呼" }]}>
        <Input prefix={<UserOutlined />} placeholder="例如：店长小林" />
      </Form.Item>
      <PhoneField />
      <PasswordField autoComplete="new-password" />
      <Form.Item
        label="确认密码"
        name="confirmPassword"
        dependencies={["password"]}
        rules={[
          { required: true, message: "请再次输入密码" },
          ({ getFieldValue }) => ({ validator: (_, value) => !value || getFieldValue("password") === value ? Promise.resolve() : Promise.reject(new Error("两次密码不一致")) }),
        ]}
      >
        <Input.Password placeholder="再次输入密码" autoComplete="new-password" />
      </Form.Item>
      {error && <Typography.Paragraph type="danger" className={styles.error}>{error}</Typography.Paragraph>}
      <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
        {registrationType === "store" ? "创建门店和店长账户" : registrationType === "dm" ? "加入门店并注册 DM" : "注册普通用户"}
      </Button>
    </Form>
  );
}
