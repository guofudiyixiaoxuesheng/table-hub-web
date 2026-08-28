"use client";

import { Form, Input, Modal, Typography } from "antd";
import { useState } from "react";
import { useAuth } from "./auth-provider";
import { PasswordField } from "./auth-form-fields";

type Values = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function ChangePasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [form] = Form.useForm<Values>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { changePassword } = useAuth();

  const submit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      setError(null);
      await changePassword(values.currentPassword, values.newPassword);
      form.resetFields();
      onClose();
    } catch (reason) {
      if (reason instanceof Error) setError(reason.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="修改密码" open={open} onCancel={onClose} onOk={submit} confirmLoading={submitting} okText="确认修改" cancelText="取消" destroyOnHidden>
      <Typography.Paragraph type="secondary">修改后其他已登录设备也会失效，需要重新登录。</Typography.Paragraph>
      <Form form={form} layout="vertical" requiredMark={false}>
        <PasswordField name="currentPassword" label="当前密码" />
        <PasswordField name="newPassword" label="新密码" autoComplete="new-password" />
        <Form.Item
          label="确认新密码"
          name="confirmPassword"
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: "请再次输入新密码" },
            ({ getFieldValue }) => ({ validator: (_, value) => !value || getFieldValue("newPassword") === value ? Promise.resolve() : Promise.reject(new Error("两次密码不一致")) }),
          ]}
        >
          <Input.Password placeholder="再次输入新密码" autoComplete="new-password" />
        </Form.Item>
        {error && <Typography.Paragraph type="danger">{error}</Typography.Paragraph>}
      </Form>
    </Modal>
  );
}
