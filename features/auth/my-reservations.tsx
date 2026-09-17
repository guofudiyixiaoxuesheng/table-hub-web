"use client";

import { useEffect, useState } from "react";
import { Card, Empty, Skeleton, Space, Statistic } from "antd";
import { SessionCarCard, type SessionCarCardData } from "@/features/sessions/session-car-card";
import { listMyGameSessions, type PublicGameSession } from "@/lib/player-h5/player-public-api";
import { useAuth } from "./auth-provider";

function toSessionCard(item: PublicGameSession): SessionCarCardData {
  return {
    id: item.id,
    title: item.title,
    scriptName: item.scriptName,
    startTime: item.startTime,
    durationMinutes: item.durationMinutes,
    capacity: item.capacity,
    joinedSeats: item.joinedSeats,
    priceCents: item.priceCents,
    coverImageUrl: item.coverImageUrl,
    joinStatus: item.myReservationStatus ?? "confirmed",
    reservationCode: item.myReservationCode ?? "",
  };
}

export function MyReservations({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<PublicGameSession[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role === "guest") return;
    void Promise.resolve().then(() => {
      setLoading(true);
      listMyGameSessions()
        .then(setSessions)
        .catch(() => setSessions([]))
        .finally(() => setLoading(false));
    });
  }, [user]);

  if (!user || user.role === "guest") {
    return (
      <Card className="surface-card" title="我的拼车">
        <Empty description="登录后可以查看自己的拼车记录和预约码" />
      </Card>
    );
  }

  const activeSessions = sessions.filter((item) => item.myReservationStatus !== "cancelled");
  const cancelledCount = sessions.length - activeSessions.length;

  return (
    <Card className="surface-card" title="我的拼车">
      {loading ? <Skeleton active /> : null}
      {!loading && sessions.length === 0 ? <Empty description="暂无拼车记录，去玩家端选择一个喜欢的剧本吧" /> : null}
      {!loading && sessions.length > 0 ? (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Space wrap>
            <Statistic title="累计预约" value={sessions.length} suffix="次" />
            <Statistic title="进行中" value={activeSessions.length} suffix="个" />
            <Statistic title="跳车/取消" value={cancelledCount} suffix="次" />
          </Space>
          <div style={{ display: "grid", gap: 12 }}>
            {(activeSessions.length ? activeSessions : sessions).slice(0, compact ? 3 : 6).map((item) => (
              <SessionCarCard
                key={`${item.id}-${item.myReservationCode}`}
                session={toSessionCard(item)}
                href={`/p/sessions/${item.id}`}
                compact={compact}
              />
            ))}
          </div>
        </Space>
      ) : null}
    </Card>
  );
}
