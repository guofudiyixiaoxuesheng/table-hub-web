"use client";

import { LockOutlined, MobileOutlined } from "@ant-design/icons";
import { Form, Input } from "antd";

export function PhoneField() {
  return (
    <Form.Item
      label="手机号"
      name="phone"
      rules={[
        { required: true, message: "请输入手机号" },
        { pattern: /^\+?[1-9]\d{6,14}$/, message: "手机号格式不正确" },
      ]}
    >
      <Input prefix={<MobileOutlined />} placeholder="请输入登录手机号" autoComplete="tel" />
    </Form.Item>
  );
}

export function PasswordField({
  name = "password",
  label = "密码",
  placeholder = "请输入密码",
  autoComplete = "current-password",
}: {
  name?: string;
  label?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <Form.Item
      label={label}
      name={name}
      rules={[
        { required: true, message: `请输入${label}` },
        { min: 8, message: "密码至少 8 位" },
      ]}
    >
      <Input.Password
        prefix={<LockOutlined />}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
    </Form.Item>
  );
}

export function SmsCodeField() {
  return <Input placeholder="请输入短信验证码" inputMode="numeric" autoComplete="one-time-code" />;
}
