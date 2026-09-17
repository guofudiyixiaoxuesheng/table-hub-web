"use client";

import { InputNumber, Modal, Typography, message as antdMessage } from "antd";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";
import { joinGameSession } from "@/lib/game-sessions/game-session-api";
import type { CarpoolSessionCandidate } from "./chat-message-content";

const PENDING_CARPOOL_RESERVATION_KEY = "tablehub:pending-carpool-reservation";

type CarpoolReservationModalProps = {
  session: CarpoolSessionCandidate | null;
  onClose: () => void;
  onJoined?: () => void;
};

export function consumePendingCarpoolReservation(): CarpoolSessionCandidate | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(PENDING_CARPOOL_RESERVATION_KEY);
  window.sessionStorage.removeItem(PENDING_CARPOOL_RESERVATION_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as CarpoolSessionCandidate;
    return typeof value?.id === "string" ? value : null;
  } catch {
    return null;
  }
}

export function CarpoolReservationModal({ session, onClose, onJoined }: CarpoolReservationModalProps) {
  const [seatCount, setSeatCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [messageApi, contextHolder] = antdMessage.useMessage();
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => setSeatCount(1), [session?.id]);

  const submit = async () => {
    if (!session) return;
    if (loading) return;
    if (!user) {
      window.sessionStorage.setItem(PENDING_CARPOOL_RESERVATION_KEY, JSON.stringify(session));
      messageApi.info("登录后即可继续确认上车");
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setSubmitting(true);
    try {
      const result = await joinGameSession(session.id, { seatCount });
      messageApi.success(result.myReservationCode ? `上车成功，预约码 ${result.myReservationCode}` : "上车成功");
      onJoined?.();
      onClose();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "上车失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        destroyOnHidden
        title="确认上车"
        open={Boolean(session)}
        okText="确认上车"
        cancelText="再看看"
        confirmLoading={submitting}
        onCancel={onClose}
        onOk={() => void submit()}
      >
        {session ? (
          <div>
            <Typography.Title level={5} style={{ marginTop: 0 }}>{session.scriptName}</Typography.Title>
            <Typography.Paragraph type="secondary">余 {session.remainingSeats} 位；确认后将创建你的预约记录。</Typography.Paragraph>
            <label htmlFor="carpool-seat-count">本次占位人数</label>
            <InputNumber
              id="carpool-seat-count"
              min={1}
              max={Math.min(session.remainingSeats, 10)}
              value={seatCount}
              onChange={(value) => setSeatCount(typeof value === "number" ? value : 1)}
              style={{ display: "block", marginTop: 8, width: "100%" }}
            />
          </div>
        ) : null}
      </Modal>
    </>
  );
}
