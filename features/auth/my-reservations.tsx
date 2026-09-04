"use client";

import { useEffect, useState } from "react";
import { Card, Empty, Skeleton, Space, Statistic, Tag, Typography } from "antd";
import { getMyPlayerBehavior, type PlayerBehaviorSummary, type PlayerBehaviorSession } from "@/lib/players/player-api";
import { SessionCarCard, type SessionCarCardData } from "@/features/sessions/session-car-card";
import { useAuth } from "./auth-provider";

function toSessionCard(item: PlayerBehaviorSession): SessionCarCardData {
  return {
    id: item.session_id,
    title: item.title,
    scriptName: item.script_name,
    startTime: item.start_time,
    durationMinutes: item.duration_minutes,
    capacity: item.capacity,
    joinedSeats: item.joined_seats,
    priceCents: item.price_cents,
    coverImageUrl: item.cover_image_url,
    joinStatus: item.join_status,
    reservationCode: item.reservation_code,
  };
}

export function MyReservations({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [data, setData] = useState<PlayerBehaviorSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role === "guest") return;
    void Promise.resolve().then(() => {
      setLoading(true);
      getMyPlayerBehavior()
        .then(setData)
        .catch(() => setData(null))
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

  const activeSessions = data?.recent_sessions.filter((item) => item.join_status !== "cancelled") ?? [];
  const recentSessions = data?.recent_sessions ?? [];

  return (
    <Card className="surface-card" title="我的拼车">
      {loading ? <Skeleton active /> : null}
      {!loading && !data ? <Empty description="暂无拼车记录，去玩家端选择一个喜欢的剧本吧" /> : null}
      {!loading && data ? (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Space wrap>
            <Statistic title="累计预约" value={data.reservation_count} suffix="次" />
            <Statistic title="进行中" value={data.active_reservation_count} suffix="个" />
            <Statistic title="跳车/取消" value={data.cancelled_count} suffix="次" />
          </Space>
          {data.favorite_genres.length ? (
            <Space wrap>
              <Typography.Text type="secondary">偏好类型</Typography.Text>
              {data.favorite_genres.map((genre) => <Tag key={genre}>{genre}</Tag>)}
            </Space>
          ) : null}
          <div style={{ display: "grid", gap: 12 }}>
            {(activeSessions.length ? activeSessions : recentSessions).slice(0, compact ? 3 : 6).map((item) => (
              <SessionCarCard
                key={`${item.session_id}-${item.reservation_code}`}
                session={toSessionCard(item)}
                href={`/p/sessions/${item.session_id}`}
                compact={compact}
              />
            ))}
          </div>
        </Space>
      ) : null}
    </Card>
  );
}
